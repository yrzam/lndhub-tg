/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-underscore-dangle */
import winston from 'winston';
import fetch, { FetchError, RequestInit } from 'node-fetch';
import { ZodError } from 'zod';
import urlJoin from 'url-join';
import validUrl from 'valid-url';
import { plainToInstance } from 'class-transformer';
import { Wallets, TSWallet } from '../schemas/db/wallet';
import * as schemas from '../schemas/hub';
import WalletError from '../schemas/errors/wallet';
import Amount from './currency/amount';
import LnInvoice from './payment/ln-invoice';
import OnchainTx from './payment/onchain';
import { PaymentRequest } from './payment/request';

type MaybePromise<T> = T | Promise<T>;

function checkApiError(res: string) {
  const dt = schemas.error.safeParse(res);
  if (dt.success) {
    throw new WalletError(dt.data.message, 'serverError', dt.data.code);
  }
  return res;
}

function handleErrors(err: Error): never {
  winston.debug('Wallet model error: %s', err.message);
  if (err instanceof WalletError) throw err;
  else if (err instanceof ZodError) {
    throw new WalletError(err.message, 'ansInvalid');
  } else if (err instanceof FetchError) {
    throw new WalletError(err.message, 'noConnection');
  } else throw err;
}

export class Wallet {
  private _id: string;

  private _meta?: TSWallet;

  private _session?: WalletSessionData;

  private _cache: WalletCacheData = {};

  private _btcAddr?: string;

  private _flushCacheOnNextReq = false;

  constructor(
    id: string,
    session?: WalletSessionData,
    cache?: WalletCacheData,
  ) {
    this._id = id;
    if (session) this._session = session;
    if (cache) {
      this._cache = cache;
      this.deserializeCache();
    }
  }

  static async create(hubUrl: string): Promise<{
    id: string,
    backup: string
  }> {
    winston.debug('Creating new account on %s', hubUrl);
    if (!validUrl.isWebUri(hubUrl)) throw new WalletError('Invalid url', 'reqInvalid');
    const authData = await fetch(urlJoin(hubUrl, 'create'), { method: 'POST' })
      .then((res) => res.json())
      .then((res) => checkApiError(res))
      .then((res) => schemas.createAcc.parse(res))
      .catch(handleErrors);
    winston.debug('Api call succeed, posting new wallet to db');
    const rec = await Wallets.create({ ...authData, hubUrl });
    winston.debug('Done! Id=%s', rec.id);
    return {
      id: rec.id,
      backup: `lndhub://${authData.login}:${authData.password}@${hubUrl}`,
    };
  }

  static async import(hubUrl: string, authData: { login: string, password: string }) {
    winston.debug('Importing account on %s', hubUrl);
    const rec = await Wallets.create({ ...authData, hubUrl });
    if (!await new Wallet(rec.id).session) throw new Error('No access');
    return {
      id: rec.id,
      backup: `lndhub://${authData.login}:${authData.password}@${hubUrl}`,
    };
  }

  async edit(data: { name?: string, sortPriority?: number }) {
    if (data.name && data.name.length > 15) throw new Error('Name too long');
    await Wallets.findByIdAndUpdate(this._id, data);
    return this;
  }

  async delete() {
    await Wallets.findByIdAndDelete(this._id);
  }

  get backup(): Promise<string> {
    return Wallets.findById(this._id).then((res) => {
      if (!res) throw new Error('Cannot retrieve backup');
      return `lndhub://${res.login}:${res.password}@${res.hubUrl}`;
    });
  }

  async loadBtcAddr() {
    this._btcAddr = await this.authReq('GET', 'getbtc')
      .then((res) => schemas.getBtcAddr.parse(res)[0].address)
      .catch(handleErrors);
  }

  async loadBalance() {
    this.flushCacheIfNeeded();
    this._cache.balance = await this.authReq('GET', 'balance')
      .then((res) => schemas.balance.parse(res).BTC.AvailableBalance)
      .catch(handleErrors);
    this._cache.lastUpdate = new Date();
    return this;
  }

  async loadTxs() {
    const [rawPending, rawTxs, rawInvoices] = await Promise.all([
      this.authReq('GET', 'getpending')
        .then((res) => schemas.getPending.parse(res)),
      this.authReq('GET', 'gettxs')
        .then((res) => schemas.getTxs.parse(res)),
      this.authReq('GET', 'getuserinvoices')
        .then((res) => schemas.getInvoices.parse(res)),
    ]).catch(handleErrors);
    const txs: Array<OnchainTx | LnInvoice> = [];
    const invs: Array<LnInvoice> = [];
    rawPending.forEach((tx) => {
      txs.push(new OnchainTx({
        occured: false,
        direction: 'receive',
        amount: new Amount(tx.amount * 100_000_000),
        time: new Date(tx.time * 1000),
        confCount: tx.confirmations,
      }));
    });
    rawTxs.forEach((tx) => {
      if ('category' in tx && tx.category === 'receive' && tx.type === 'bitcoind_tx') {
        txs.push(new OnchainTx({
          occured: true,
          direction: 'receive',
          amount: new Amount(tx.amount * 100_000_000),
          time: new Date(tx.time * 1000),
        }));
      } else if ('value' in tx && tx.type === 'paid_invoice') {
        txs.push(new LnInvoice({
          occured: true,
          direction: 'send',
          // IMPORTANT: following LndHub double fee calculation bug
          amount: new Amount(tx.value - tx.fee * 2),
          fees: new Amount(tx.fee * 2),
          /// ////////////////////////////////////////////////
          time: new Date(tx.timestamp * 1000),
          ...(tx.memo ? { description: tx.memo } : {}),
        }));
      }
    });
    rawInvoices.forEach((inv) => {
      if (inv.type === 'user_invoice' && inv.ispaid) {
        txs.push(new LnInvoice({
          occured: true,
          direction: 'receive',
          amount: new Amount(inv.amt),
          time: new Date(inv.timestamp * 1000),
          ...(inv.description ? { description: inv.description } : {}),
        }));
      } else if (inv.type === 'user_invoice' && !inv.ispaid) {
        invs.push(new LnInvoice({
          occured: false,
          direction: 'receive',
          payReq: new PaymentRequest(inv.payment_request, 'ln'),
          amount: new Amount(inv.amt),
          time: new Date(inv.timestamp * 1000),
          expires: new Date((inv.timestamp + inv.expire_time) * 1000),
          ...(inv.description ? { description: inv.description } : {}),
        }));
      }
    });
    this.flushCacheIfNeeded();
    this._cache.txs = txs.sort((a, b) => b.time.getTime() - a.time.getTime());
    this._cache.unpaidInvoices = invs.sort((a, b) => b.time.getTime() - a.time.getTime());
    this._cache.lastUpdate = new Date();
  }

  flushCache() {
    delete this._cache.balance;
    delete this._cache.txs;
    delete this._cache.unpaidInvoices;
    delete this._cache.lastUpdate;
    return this;
  }

  cacheBehaviorNext(behavior: 'flushOnMiss' | 'normal') {
    this._flushCacheOnNextReq = behavior === 'flushOnMiss';
    return this;
  }

  async createInvoice(amount: Amount, description: string) : Promise<PaymentRequest> {
    const inv = await this.authReq('POST', 'addinvoice', {
      body: JSON.stringify({
        amt: amount.get(),
        memo: description,
      }),
    })
      .then((res) => schemas.createInvoice.parse(res))
      .catch(handleErrors);
    return new PaymentRequest(inv.payment_request, 'ln');
  }

  async getInvoiceInfo(payReq: PaymentRequest) : Promise<LnInvoice> {
    const data = await this.authReq('GET', ['decodeinvoice', `?invoice=${payReq.str}`])
      .then((res) => schemas.getInvoiceInfo.parse(res))
      .catch(handleErrors);
    return new LnInvoice({
      amount: new Amount(data.num_satoshis),
      time: new Date(data.timestamp * 1000),
      expires: new Date(data.timestamp * 1000 + data.expiry * 1000),
      payReq,
      description: data.description,
    });
  }

  // amountSat is only required for tip invoices
  async payInvoice(payReq: PaymentRequest, amountSat = 0) {
    await this.authReq('POST', 'payinvoice', {
      body: JSON.stringify({ invoice: payReq.str, amount: amountSat }),
    }).then((res) => schemas.payInvoice.parse(res))
      .catch(handleErrors);
    return true;
  }

  get meta(): MaybePromise<TSWallet> {
    if (this._meta) return this._meta;
    return Wallets.findById(this.id)
      .catch(() => {
        throw new Error('No wallet found');
      }).then((res) => {
        this._meta = res!; return res;
      }) as Promise<TSWallet>;
  }

  get btcAddr(): MaybePromise<PaymentRequest> {
    if (this._btcAddr) return new PaymentRequest(this._btcAddr, 'btc');
    return this.loadBtcAddr().then(() => new PaymentRequest(this._btcAddr!, 'btc'));
  }

  get balance(): MaybePromise<Amount> {
    if ('balance' in this._cache) return new Amount(this._cache.balance);
    return this.loadBalance().then(() => new Amount(this._cache.balance!));
  }

  get txs() : MaybePromise<Array<OnchainTx | LnInvoice>> {
    if ('txs' in this._cache) return this._cache.txs;
    return this.loadTxs().then(() => this._cache.txs!);
  }

  get unpaidInvoices(): MaybePromise<Array<LnInvoice>> {
    if ('unpaidInvoices' in this._cache) return this._cache.unpaidInvoices;
    return this.loadTxs().then(() => this._cache.unpaidInvoices!);
  }

  get session(): MaybePromise<WalletSessionData> {
    if (this._session) return this._session;
    return this.authorize('credentials').then(() => this._session!);
  }

  get lastCacheUpdate() : Date | undefined {
    return this._cache.lastUpdate;
  }

  get cache(): WalletCacheData {
    return this._cache;
  }

  hasCached(prop: 'all' | keyof WalletCacheData): boolean {
    if (prop === 'all') {
      return 'balance' in this._cache
      && 'txs' in this._cache
      && 'unpaidInvoices' in this._cache;
    }
    return prop in this._cache;
  }

  get id(): string {
    return this._id;
  }

  private async authorize(
    type: 'credentials' | 'refreshToken',
    refreshToken?: string,
  ) {
    if (type === 'refreshToken' && !refreshToken) throw new Error('Bad args');
    const { hubUrl, login, password } = await this.meta;
    const tokens = await this.req('POST', [
      'auth',
      `?type=${type === 'refreshToken'
        ? 'refresh_token'
        : 'auth'}`,
    ], {
      body: type === 'refreshToken'
        ? JSON.stringify({ refresh_token: refreshToken! })
        : JSON.stringify({ login, password }),
    }, hubUrl)
      .then((res) => schemas.auth.parse(res))
      .catch(handleErrors);
    const sData = {
      hubUrl,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
    if (!this._session) this._session = sData;
    else Object.assign(this._session, sData);
    return this;
  }

  private async req(
    method: 'GET' | 'POST',
    path: string | Array<string>,
    opts?: RequestInit,
    overrideHubUrl?: string,
  ) {
    const hubUrl = overrideHubUrl || (await this.session).hubUrl;
    const reqParam = { method, ...opts };
    reqParam.headers = {
      ...reqParam.headers,
      'Content-type': 'application/json; charset=UTF-8',
    };
    return fetch(urlJoin(hubUrl, ...(typeof path === 'string' ? [path] : path)), reqParam)
      .then((res) => res.json())
      .then((res) => checkApiError(res));
  }

  private async authReq(
    method: 'GET' | 'POST',
    path: string | Array<string>,
    opts?: RequestInit,
    preferredAuth:
    'accessToken' | 'refreshToken' | 'credentials'
    = 'accessToken',
  ) : Promise<unknown> {
    const { accessToken, refreshToken } = await this.session;
    try {
      if (preferredAuth !== 'accessToken') await this.authorize(preferredAuth, refreshToken);
      return await this.req(method, path, {
        ...opts,
        headers: { ...opts?.headers, Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      if (err instanceof WalletError
        && err.data.serverError?.key === 'badAuth'
        && preferredAuth !== 'credentials') {
        return this.authReq(
          method,
          path,
          opts,
          preferredAuth === 'accessToken'
            ? 'refreshToken'
            : 'credentials',
        );
      }
      throw err;
    }
  }

  private flushCacheIfNeeded() {
    if (this._flushCacheOnNextReq) {
      this.flushCache();
      this._flushCacheOnNextReq = false;
    }
  }

  private deserializeCache() {
    this._cache.txs?.forEach((el, i) => {
      if (el.type === 'onchain' && !(el instanceof OnchainTx)) {
        this._cache.txs![i] = plainToInstance(OnchainTx, el);
      } else if (!(el instanceof LnInvoice)) {
        this._cache.txs![i] = plainToInstance(LnInvoice, el);
      }
    });
    if (this._cache.unpaidInvoices) {
      this._cache.unpaidInvoices = plainToInstance(LnInvoice, this._cache.unpaidInvoices);
    }
  }
}

export type WalletSessionData = {
  hubUrl: string
  accessToken: string,
  refreshToken: string,
};

export type WalletCacheData = {
  balance?: number
  txs?: Array<LnInvoice | OnchainTx>
  unpaidInvoices?: Array<LnInvoice>
  lastUpdate?: Date
};

export { WalletError };

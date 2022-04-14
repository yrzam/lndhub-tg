/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-underscore-dangle */
import winston from 'winston';
import fetch, { FetchError, RequestInit } from 'node-fetch';
import { ZodError } from 'zod';
import urlJoin from 'url-join';
import validUrl from 'valid-url';
import { plainToInstance } from 'class-transformer';
import { Wallets, TSWallet } from '../schemas/db';
import * as schemas from '../schemas/hub';
import { WalletError } from '../schemas/errors';
import { Amount } from './currency';
import {
  SettledInvoice, UnpaidInvoice, PaymentRequest, OnchainTx,
} from './payment';

type MaybePromise<T> = T | Promise<T>;

function checkApiError(res: string) {
  const dt = schemas.error.safeParse(res);
  if (dt.success) {
    winston.debug('Api respone matches server error: "%s"', dt.data.message);
    throw new WalletError(dt.data.message, 'serverError', dt.data.code);
  }
  return res;
}

function handleErrors(err: Error): never {
  winston.debug('Wallet model error: %s', err.message);
  if (err instanceof WalletError) {
    winston.debug('Routing w error: logic error (walletError)');
    throw err;
  } else if (err instanceof ZodError) {
    winston.debug('Routing w error: invalid response (ZodError)');
    throw new WalletError(err.message, 'ansInvalid');
  } else if (err instanceof FetchError) {
    winston.debug('Routing w error: network error (FetchError)');
    throw new WalletError(err.message, 'noConnection');
  } else {
    winston.debug('Routing w error: other');
    throw err;
  }
}

export class Wallet {
  private _id: string;

  private _maybeOldMeta?: TSWallet;

  private _session?: WalletSessionData;

  private _cache: WalletCacheData = {};

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

  static async create(hubUrl: string): Promise<Wallet> {
    winston.info('Wallet: creating new account on %s', hubUrl);
    if (!validUrl.isWebUri(hubUrl)) throw new WalletError('Invalid url', 'reqInvalid');
    const authData = await fetch(urlJoin(hubUrl, 'create'), { method: 'POST' })
      .then((res) => res.json())
      .then((res) => checkApiError(res))
      .then((res) => schemas.createAcc.parse(res))
      .catch(handleErrors);
    winston.debug('Api call succeed, posting new wallet to db');
    const rec = await Wallets.create({ ...authData, hubUrl });
    winston.debug('Done! Id=%s', rec.id);
    return new Wallet(rec.id);
  }

  static async import(hubUrl: string, authData: { login: string, password: string }) {
    winston.info('Wallet: importing account on %s', hubUrl);
    const rec = await Wallets.create({ ...authData, hubUrl });
    winston.debug('Saved to DB, checking if it is accessible');
    if (!await new Wallet(rec.id).session) throw new Error('No access');
    winston.debug('Api call succeed. Import successful. Id=%s', rec.id);
    return {
      id: rec.id,
      backup: `lndhub://${authData.login}:${authData.password}@${hubUrl}`,
    };
  }

  async edit(data: { name?: string, sortPriority?: number }) {
    winston.info('Wallet: editing wallet with new data: "%s"', data);
    if (data.name && data.name.length > 15) throw new Error('Name too long');
    await Wallets.findByIdAndUpdate(this._id, data);
    winston.debug('Wallet data updated');
    return this;
  }

  async delete() {
    winston.info('Wallet: deleting %s', this._id);
    await Wallets.findByIdAndDelete(this._id);
    winston.debug('Wallet deleted');
  }

  get backup(): MaybePromise<string> {
    winston.debug('Wallet: requested backup of %s', this._id);
    if (this._maybeOldMeta) {
      return `lndhub://${this._maybeOldMeta.login
      }:${this._maybeOldMeta.password}@${this._maybeOldMeta.hubUrl}`;
    }
    return this.meta.then(() => `lndhub://${this._maybeOldMeta!.login
    }:${this._maybeOldMeta!.password}@${this._maybeOldMeta!.hubUrl}`);
  }

  async loadBtcAddr() {
    winston.info('Wallet: loading btc address for %s', this._id);
    this._cache.btcAddr = await this.authReq('GET', 'getbtc')
      .then((res) => schemas.getBtcAddr.parse(res)[0].address)
      .catch(handleErrors);
    // not updating _cache.lastUpdate because addr is immutable
    winston.debug('Btc address loaded and saved to cache');
    return this;
  }

  async loadBalance() {
    winston.info('Wallet: loading balance for %s', this._id);
    this.flushCacheIfNeeded();
    this._cache.balance = await this.authReq('GET', 'balance')
      .then((res) => schemas.balance.parse(res).BTC.AvailableBalance)
      .catch(handleErrors);
    this._cache.lastUpdate = new Date();
    winston.debug('Balance loaded and saved to cache');
    return this;
  }

  async loadTxs() {
    winston.info('Wallet: loading all transactions for %s', this._id);
    const [rawPending, rawTxs, rawInvoices] = await Promise.all([
      this.authReq('GET', 'getpending')
        .then((res) => schemas.getPending.parse(res)),
      this.authReq('GET', 'gettxs')
        .then((res) => schemas.getTxs.parse(res)),
      this.authReq('GET', 'getuserinvoices')
        .then((res) => schemas.getInvoices.parse(res)),
    ]).catch(handleErrors);
    winston.debug('Api calls succeed. Parsing...');
    const txs: Array<OnchainTx | SettledInvoice> = [];
    const invs: Array<UnpaidInvoice> = [];
    rawPending.forEach((tx) => {
      txs.push(new OnchainTx({
        occured: false,
        direction: 'receive',
        amount: new Amount(tx.amount * 100_000_000),
        time: new Date(tx.time * 1000),
        confCount: tx.confirmations,
      }));
    });
    winston.debug('rawPending parsed (len=%d)', rawPending.length);
    rawTxs.forEach((tx) => {
      if ('category' in tx && tx.category === 'receive' && tx.type === 'bitcoind_tx') {
        txs.push(new OnchainTx({
          occured: true,
          direction: 'receive',
          amount: new Amount(tx.amount * 100_000_000),
          time: new Date(tx.time * 1000),
        }));
      } else if ('value' in tx && tx.type === 'paid_invoice') {
        txs.push(new SettledInvoice({
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
    winston.debug('rawTxs parsed (len=%d)', rawTxs.length);
    rawInvoices.forEach((inv) => {
      if (inv.type === 'user_invoice' && inv.ispaid) {
        txs.push(new SettledInvoice({
          direction: 'receive',
          amount: new Amount(inv.amt),
          fees: new Amount(0),
          time: new Date(inv.timestamp * 1000),
          ...(inv.payment_request
            ? { payReq: new PaymentRequest(inv.payment_request, 'ln') } : {}),
          ...(inv.description ? { description: inv.description } : {}),
        }));
      } else if (inv.type === 'user_invoice' && !inv.ispaid) {
        invs.push(new UnpaidInvoice({
          direction: 'receive',
          payReq: new PaymentRequest(inv.payment_request, 'ln'),
          amount: new Amount(inv.amt),
          time: new Date(inv.timestamp * 1000),
          expires: new Date((inv.timestamp + inv.expire_time) * 1000),
          ...(inv.description ? { description: inv.description } : {}),
        }));
      }
    });
    winston.debug('rawInvoices parsed (len=%d)', rawInvoices.length);
    this.flushCacheIfNeeded();
    this._cache.txs = txs.sort((a, b) => b.time.getTime() - a.time.getTime());
    this._cache.unpaidInvoices = invs.sort((a, b) => b.time.getTime() - a.time.getTime());
    this._cache.lastUpdate = new Date();
    winston.debug('Txs loaded, sorted and saved into cache');
    return this;
  }

  flushCache() {
    winston.debug('Wallet: flushing cache for %s', this._id);
    delete this._cache.balance;
    delete this._cache.txs;
    delete this._cache.unpaidInvoices;
    delete this._cache.lastUpdate;
    return this;
  }

  cacheBehaviorNext(behavior: 'flushOnMiss' | 'normal') {
    winston.debug('Wallet: cache behavior for next req is %s', behavior);
    this._flushCacheOnNextReq = behavior === 'flushOnMiss';
    return this;
  }

  async createInvoice(amount: Amount, description?: string): Promise<UnpaidInvoice> {
    winston.info('Wallet: creating invoice (amt=%d, memo=%s) for'
      + ' %s', amount.get(), description, this._id);
    const apiPayReq = await this.authReq('POST', 'addinvoice', {
      body: JSON.stringify({
        amt: amount.get(),
        ...(description ? { memo: description } : {}),
      }),
    })
      .then((res) => schemas.createInvoice.parse(res))
      .catch(handleErrors);
    winston.debug('PayReq created, retrieving full invoice info');
    const inv = this.getInvoiceInfo(new PaymentRequest(apiPayReq.payment_request, 'ln'));
    winston.debug('Invoice ready');
    return inv;
  }

  async getInvoiceInfo(payReq: PaymentRequest): Promise<UnpaidInvoice> {
    winston.info('Wallet: getting invoice info for %s', this._id);
    const data = await this.authReq('GET', ['decodeinvoice', `?invoice=${payReq.str}`])
      .then((res) => schemas.getInvoiceInfo.parse(res))
      .catch(handleErrors);
    winston.debug('Retrieved full invoice info');
    return new UnpaidInvoice({
      amount: new Amount(data.num_satoshis),
      time: new Date(data.timestamp * 1000),
      expires: new Date(data.timestamp * 1000 + data.expiry * 1000),
      payReq,
      description: data.description,
    });
  }

  // amountSat is only required for tip invoices
  async payInvoice(invoice: UnpaidInvoice | PaymentRequest, amountSat = 0) {
    winston.info('Wallet: %s tries to pay provided invoice', this._id);
    const payReq = invoice instanceof PaymentRequest
      ? invoice : invoice.payReq;
    await this.authReq('POST', 'payinvoice', {
      body: JSON.stringify({ invoice: payReq.str, amount: amountSat }),
    }).then((res) => schemas.payInvoice.parse(res))
      .catch(handleErrors);
    winston.debug('Succesfully paid an invoice');
  }

  async checkReceival(invoice: UnpaidInvoice | PaymentRequest): Promise<boolean> {
    winston.info('Wallet: checking receival of invoice for %s', this._id);
    const payReq = invoice instanceof PaymentRequest
      ? invoice : invoice.payReq;
    if (this._cache.txs) {
      return this._cache.txs.some((el) => el instanceof SettledInvoice
        && el.payReq?.str === payReq.str);
    }
    winston.info('Wallet: retrieving user invoices for wallet %s', this._id);
    return this.authReq('GET', 'getuserinvoices')
      .then((res) => schemas.getInvoices.parse(res))
      .then((res) => res.some((el) => el.ispaid && el.payment_request === payReq.str));
  }

  get meta(): Promise<TSWallet> {
    winston.info('Wallet: loading meta for %s', this._id);
    // data is too sensitive to be in cache, although it is not session
    return Wallets.findById(this._id).then((res) => {
      if (!res) throw new Error('No wallet found');
      const transformed = res.toObject();
      transformed.id = String(res._id);
      delete transformed._id;
      this._maybeOldMeta = transformed;
      return transformed;
    });
  }

  get btcAddr(): MaybePromise<PaymentRequest> {
    winston.debug('Wallet: requested btc addr for %s', this._id);
    if ('btcAddr' in this._cache) return new PaymentRequest(this._cache.btcAddr!, 'btc');
    return this.loadBtcAddr().then(() => new PaymentRequest(this._cache.btcAddr!, 'btc'));
  }

  get balance(): MaybePromise<Amount> {
    winston.debug('Wallet: requested balance for %s', this._id);
    if ('balance' in this._cache) return new Amount(this._cache.balance!);
    return this.loadBalance().then(() => new Amount(this._cache.balance!));
  }

  get txs(): MaybePromise<Array<OnchainTx | SettledInvoice>> {
    winston.debug('Wallet: requested txs for %s', this._id);
    if ('txs' in this._cache) return this._cache.txs!;
    return this.loadTxs().then(() => this._cache.txs!);
  }

  get unpaidInvoices(): MaybePromise<Array<UnpaidInvoice>> {
    winston.debug('Wallet: requested unpaidInvs for %s', this._id);
    if ('unpaidInvoices' in this._cache) return this._cache.unpaidInvoices!;
    return this.loadTxs().then(() => this._cache.unpaidInvoices!);
  }

  get session(): MaybePromise<WalletSessionData> {
    if (this._session) return this._session;
    return (async () => {
      winston.debug('Wallet: no session. Loading meta');
      const meta = this._maybeOldMeta || await this.meta;
      if (meta.sessionBackup) {
        winston.debug('Restore session from backup in model');
        this._session = { hubUrl: meta.hubUrl, ...meta.sessionBackup };
      } else await this.authorize('credentials');
      return this._session!;
    })();
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
    if (type === 'refreshToken' && !refreshToken) {
      // obviously it would fail with badAuth
      throw new WalletError('badAuth', 'serverError', 1);
    }
    winston.info('Authorizing %s, method=%s', this._id, type);
    const { hubUrl, login, password } = this._maybeOldMeta || await this.meta;
    winston.debug('Meta loaded. Sending auth request...');
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
    Wallets.findByIdAndUpdate(this._id, { sessionBackup: sData }).catch((e) => e);
    winston.debug('Successfully authorized, updated session and created backup');
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
    winston.debug('Sending %s request to '
      + '%s on %s', method, typeof path === 'string' ? path : path[0], hubUrl);
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
      if (preferredAuth !== 'accessToken') {
        winston.debug('Wallet: authReq: requested auth via %s', preferredAuth);
        await this.authorize(preferredAuth, refreshToken);
      }
      return await this.req(method, path, {
        ...opts,
        headers: { ...opts?.headers, Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      if (err instanceof WalletError
        && err.data.type === 'serverError'
        && err.data.serverError.key === 'badAuth'
        && preferredAuth !== 'credentials') {
        winston.debug('Wallet: authReq: bad auth via method %s', preferredAuth);
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
      } else if (!(el instanceof SettledInvoice)) {
        this._cache.txs![i] = plainToInstance(SettledInvoice, el);
      }
    });
    if (this._cache.unpaidInvoices) {
      this._cache.unpaidInvoices = plainToInstance(UnpaidInvoice, this._cache.unpaidInvoices);
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
  txs?: Array<SettledInvoice | OnchainTx>
  unpaidInvoices?: Array<UnpaidInvoice>
  btcAddr?: string
  lastUpdate?: Date
};

export { WalletError };

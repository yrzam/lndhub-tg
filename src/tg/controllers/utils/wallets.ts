/* eslint-disable no-underscore-dangle */
import config from 'config';
import { NextFunction } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import { Wallet, WalletError, User } from '@model';
import winston from '@utils/logger-service';

export type WalletPublicData = {
  id: string,
  hubUrl: string,
  name: string,
  sortPriority: number
};

export class WalletContextBinding {
  private ctx;

  constructor(ctx: CustomCtx) {
    this.ctx = ctx;
  }

  makeActive(wallet: string | Wallet) {
    const walletId = typeof wallet === 'string' ? wallet : wallet.id;
    winston.info('Changing active wallet to %s for user %s', walletId, this.ctx.from?.id);
    this.ctx.session._activeWallet = {
      id: walletId,
      cache: {},
      rl: {
        pts: this.ctx.session._activeWallet?.rl.pts || 0,
        startTimestamp: this.ctx.session._activeWallet?.rl.startTimestamp || 0,
      },
    };
    return this;
  }

  get exist() {
    return !!this.ctx.session._wallets.length;
  }

  getPublicData(wallet: string | Wallet) : WalletPublicData {
    const data = this.getUnsortedPublicData().find((el) => el.id
      === (typeof wallet === 'string' ? wallet : wallet.id));
    if (!data) throw new Error('No such wallet');
    return data;
  }

  getAllPublicData() : Array<WalletPublicData> {
    return this.sortPublicData(this.getUnsortedPublicData());
  }

  async add(wallet: Wallet) {
    winston.info('Adding wallet %s for user %s', wallet.id, this.ctx.from?.id);
    if (typeof this.ctx.from?.id !== 'number') throw new Error('No user id');
    const wsession = await new User(this.ctx.from.id).assignWallet(wallet);
    this.ctx.session._wallets.push(wsession);
    this.makeActive(wallet);
    return this;
  }

  get count() {
    return this.ctx.session._wallets.length;
  }

  // active counts this + all, all counts all
  rl(target: 'active' | 'all', pts = 0) {
    const globalRl = this.ctx.session._globalWalletRl;
    const window = (config.get('tg.controllers.rlWindowS') as number) * 1000;
    const max = (config.get('tg.controllers.rlMaxPts') as number);
    winston.debug('Rl: user %s, target %s, pts+=%d, window=%d, max=%d'
      + '', this.ctx.from?.id, target, pts, window, max);
    if (new Date().getTime() - globalRl.startTimestamp > window) {
      globalRl.startTimestamp = new Date().getTime();
      globalRl.pts = 0;
    }
    if (globalRl.pts + pts > max) {
      throw new WalletError('Rate limit exceed', 'rateLimited');
    } else if (target === 'all') globalRl.pts += pts;
    if (target === 'active') {
      if (!this.ctx.session._activeWallet) throw new Error('No active wallet');
      const localRl = this.ctx.session._activeWallet.rl;
      if (new Date().getTime() - localRl.startTimestamp > window) {
        localRl.startTimestamp = new Date().getTime();
        localRl.pts = 0;
      }
      if (localRl.pts + globalRl.pts + pts > max) {
        throw new WalletError('Rate limit exceed', 'rateLimited');
      } else localRl.pts += pts;
    }
    return this;
  }

  sprior(delta: number | 'clear', wallet? : Wallet | string) {
    const walletId = typeof wallet === 'string' ? wallet : wallet?.id || this.getActive().id;
    winston.debug('Sprior wallet %s for user %s: ', walletId, this.ctx.from?.id, delta);
    const entry = this.getDataById(walletId);
    if (typeof delta === 'number') entry.sortPriority += delta;
    else entry.sortPriority = 0;
    return this;
  }

  async rename(wallet: Wallet | string, newName: string) {
    const w = typeof wallet === 'string' ? new Wallet(wallet) : wallet;
    winston.info('Renaming wallet %s for user %s', w.id, this.ctx.from?.id);
    await w.edit({ name: newName });
    this.getDataById(w.id).name = newName;
  }

  async remove(wallet: Wallet | string) {
    const w = typeof wallet === 'string' ? new Wallet(wallet) : wallet;
    winston.info('Removing wallet %s from user %s', w.id, this.ctx.from?.id);
    if (typeof this.ctx.from?.id !== 'number') throw new Error('No user id');
    await new User(this.ctx.from.id).detachWallet(w);
    this.ctx.session._wallets = this.ctx.session._wallets.filter((el) => el.id !== w.id);
    if (this.ctx.session._activeWallet?.id === w.id) {
      delete this.ctx.session._activeWallet;
      if (this.ctx.session._wallets.length) {
        const highestPriorId = this.ctx.session._wallets
          .reduce((a, b) => (a.sortPriority > b.sortPriority ? a : b)).id;
        this.makeActive(highestPriorId);
      }
    }
    await w.delete();
  }

  getById(walletId : string): Wallet {
    const wData = this.getDataById(walletId);
    const wallet = new Wallet(
      wData.id,
      wData.authData,
    );
    return wallet;
  }

  getActive({ useCache = true }:
  { useCache?: boolean } = {}): Wallet {
    const wData = this.getDataById(this.ctx.session._activeWallet?.id);
    const wallet = new Wallet(
      wData.id,
      wData.authData,
      this.ctx.session._activeWallet?.cache,
    );
    if (!useCache) wallet.flushCache();
    return wallet;
  }

  async checkOwnership(wallet: Wallet) {
    if (typeof this.ctx.from?.id !== 'number') throw new Error('No user id');
    winston.debug('checkOwnership of wallet %s, user %s', wallet.id, this.ctx.from?.id);
    const owns = await new User(this.ctx.from.id).owns(wallet);
    if (!owns) throw new Error('Ownership check failed');
    return wallet;
  }

  async getBackupNonActive(walletId: string) : Promise<string> {
    const wallet = new Wallet(walletId);
    return (await this.checkOwnership(wallet)).backup;
  }

  reload() {
    this.ctx.session._wallets = [];
    delete this.ctx.session._activeWallet;
    // todo
  }

  static async middleware(ctx: CustomCtx, next: NextFunction) {
    ctx.wallets = new WalletContextBinding(ctx);
    const oldPrior = WalletContextBinding.getPriorities(ctx);
    await next();
    WalletContextBinding.updatePriorities(oldPrior, WalletContextBinding.getPriorities(ctx));
  }

  private static getPriorities(ctx: CustomCtx) {
    return ctx.session._wallets.map(({ id, sortPriority }) => ({ id, sortPriority }));
  }

  private static updatePriorities(
    oldPrior: Array<{ id: string, sortPriority: number }>,
    newPrior: Array<{ id: string, sortPriority: number }>,
  ) {
    oldPrior.forEach(async (old) => {
      const corrNew = newPrior.find((newEl) => newEl.id === old.id);
      if (corrNew && corrNew.sortPriority !== old.sortPriority) {
        await new Wallet(corrNew.id).edit({ sortPriority: corrNew.sortPriority });
      }
    });
  }

  private getDataById(id: string | undefined) {
    if (!id) throw new Error('No wallet id');
    const wData = this.ctx.session._wallets
      .find((el) => el.id === id);
    if (!wData) throw new Error('Active wallet not found');
    return wData;
  }

  private getUnsortedPublicData() {
    return this.ctx.session._wallets.map(({
      name, id, sortPriority, authData,
    }) => ({
      name, id, sortPriority, hubUrl: authData.hubUrl,
    }));
  }

  private sortPublicData(arr: Array<WalletPublicData>): Array<WalletPublicData> {
    let array = arr.sort((a, b) => b.sortPriority - a.sortPriority);
    const activeIndex = array.findIndex((el) => el.id
      === this.ctx.session._activeWallet?.id);
    if (activeIndex !== -1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      array = [array[activeIndex]!, ...array.filter((_, i) => i !== activeIndex)];
    }
    return array;
  }
}

export type WalletContextFlavor = {
  wallets: WalletContextBinding
};

export type RateLimiterData = {
  startTimestamp: number,
  pts: number
};

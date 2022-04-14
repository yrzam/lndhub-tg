/* eslint-disable no-underscore-dangle */
import winston from '@utils/logger-service';
import { Wallet, WalletSessionData } from './wallet';
import { Users } from '../schemas/db';

export class User {
  private _id: number;

  constructor(id: number) {
    this._id = id;
  }

  async assignWallet(wallet: Wallet)
    : Promise<UserWalletEntryMeta> {
    winston.debug('Assigning wallet %s to user %s', wallet.id, this._id);
    const meta = await wallet.meta;
    await Users.findByIdAndUpdate(this._id, {
      $addToSet: {
        wallets: wallet.id,
      },
    }, { upsert: true });
    winston.debug('Wallet assigned to user');
    return {
      id: wallet.id,
      name: meta.name,
      sortPriority: meta.sortPriority,
      authData: await wallet.session,
    };
  }

  async owns(wallet: Wallet) {
    return !!(await Users.findOne({ _id: this._id, wallets: wallet.id }));
  }

  async detachWallet(wallet: Wallet) {
    winston.debug('Detaching wallet %s from user %s', wallet.id, this._id);
    await Users.findByIdAndUpdate(this._id, {
      $pull: {
        wallets: wallet.id,
      },
    });
  }

  get id() {
    return this._id;
  }
}

export type UserWalletEntryMeta = {
  id: string, name: string, sortPriority: number,
  authData: WalletSessionData
};

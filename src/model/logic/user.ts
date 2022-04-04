/* eslint-disable no-underscore-dangle */
import { Wallet, WalletSessionData } from './wallet';
import { Users } from '../schemas/db/user';

export class User {
  private _id: number;

  constructor(id: number) {
    this._id = id;
  }

  async assignWallet(wallet: Wallet)
    : Promise<UserWalletEntryMeta> {
    const meta = await wallet.meta;
    await Users.findByIdAndUpdate(this._id, {
      $addToSet: {
        wallets: wallet.id,
      },
    }, { upsert: true });
    return {
      id: wallet.id,
      name: meta.name,
      sortPriority: meta.sortPriority,
      authData: await wallet.session,
    };
  }

  async detachWallet(wallet: Wallet) {
    await Users.findByIdAndUpdate(this._id, {
      $pull: {
        wallets: wallet.id,
      },
    });
  }
}

export type UserWalletEntryMeta = {
  id: string, name: string, sortPriority: number,
  authData: WalletSessionData
};

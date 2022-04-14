import mongoose, { Types } from 'mongoose';

export type TSUser = {
  _id: number,
  wallets: Array<Types.ObjectId>
};

const user = new mongoose.Schema<TSUser>({
  _id: Number,
  wallets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'wallet',
  }],
});

export const Users = mongoose.model('user', user);

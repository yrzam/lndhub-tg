import mongoose, { Types } from 'mongoose';

export type TSUser = {
  _id: number,
  wallets: Array<Types.ObjectId>
};

const user = new mongoose.Schema<TSUser>({
  _id: Number,
  wallets: [mongoose.Schema.Types.ObjectId],
});

export const Users = mongoose.model('user', user);

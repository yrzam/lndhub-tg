import mongoose from 'mongoose';

export type TSWallet = {
  id: string
  hubUrl: string,
  login: string,
  password: string,
  name: string,
  sortPriority: number
};

const wallet = new mongoose.Schema<TSWallet>({
  hubUrl: { type: String, required: true },
  login: { type: String, required: true },
  password: { type: String, required: true },
  name: { type: String, required: false },
  sortPriority: { type: Number, default: 0 },
});

export const Wallets = mongoose.model('wallet', wallet);

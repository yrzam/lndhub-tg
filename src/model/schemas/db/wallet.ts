import mongoose from 'mongoose';

export type TSWallet = {
  id: string
  hubUrl: string,
  login: string,
  password: string,
  name: string,
  sortPriority: number
  sessionBackup?: {
    accessToken: string,
    refreshToken: string
  }
};

const wallet = new mongoose.Schema<TSWallet>({
  hubUrl: { type: String, required: true },
  login: { type: String, required: true },
  password: { type: String, required: true },
  name: { type: String, required: false },
  sortPriority: { type: Number, default: 0 },
  sessionBackup: {
    type: {
      accessToken: { type: String, required: true },
      refreshToken: { type: String, required: true },
    },
    required: false,
  },
});

export const Wallets = mongoose.model('wallet', wallet);

import { UnpaidInvoice } from '@model/logic/payment';
import mongoose, { Types } from 'mongoose';

export type TSMappedUnpInv = {
  _id: string,
  invoice: UnpaidInvoice,
  destWalletId?: Types.ObjectId,
  checkedOnDest: boolean,
  confirmedOnDest: boolean
};

const mappedUnpInv = new mongoose.Schema<TSMappedUnpInv>({
  _id: String,
  invoice: { type: mongoose.Schema.Types.Mixed, required: true },
  destWalletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'wallet',
  },
  checkedOnDest: { type: Boolean, default: false },
  confirmedOnDest: { type: Boolean, default: false },
});

export const MappedUnpInvs = mongoose.model('mapped-invoice', mappedUnpInv);

import { Type } from 'class-transformer';
import { Tx, BaseTx } from './tx';
import { PaymentRequest } from './request';
import { Amount } from '../currency';

type InvoiceParam =
  Omit<BaseTx, 'type'> & {
    description?: string,
    payReq?: PaymentRequest,
    expires?: Date
    fees?: Amount
  };

export default class LnInvoice extends Tx {
  readonly description?;

  @Type(() => PaymentRequest)
  readonly payReq?;

  readonly expires?;

  @Type(() => Amount)
  readonly fees?;

  constructor(data: InvoiceParam) {
    if (!data) {
      super(undefined as unknown as BaseTx);
      return;
    }
    super({ ...data, type: 'offchain' });

    if (data.expires) this.expires = data.expires;
    if (data.description) this.description = data.description;
    if (data.payReq) this.payReq = data.payReq;
    if (data.fees) this.fees = data.fees;
  }

  get isPayable() {
    return !this.occured && this.expires && this.expires.getTime() > Date.now() && this.payReq;
  }
}

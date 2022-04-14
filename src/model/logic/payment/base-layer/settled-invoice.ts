// settled invoice is invoice that was paid and has known fees

import { Amount, PaymentRequest } from '@model';
import { Type } from 'class-transformer';
import { LnInvoice, InvoiceParam } from './ln-invoice';

type SettledInvoiceParam =
  Omit<InvoiceParam, 'occured'> & {
    fees: Amount
    payReq?: PaymentRequest,
  };

export default class SettledInvoice extends LnInvoice {
  override readonly occured!: boolean;

  @Type(() => Amount)
  readonly fees!: SettledInvoiceParam['fees'];

  @Type(() => PaymentRequest)
  readonly payReq?;

  constructor(data: SettledInvoiceParam) {
    if (!data) {
      super(undefined as unknown as InvoiceParam);
      return;
    }
    super({ ...data, occured: true });
    this.fees = data.fees;
    this.payReq = data.payReq;
  }

  get totalWithFees() : Amount {
    return this.amount.add(this.fees);
  }
}

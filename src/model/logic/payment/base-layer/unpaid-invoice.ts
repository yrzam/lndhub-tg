// unpaid invoice is invoice that has payment request and expiry date

import { Type } from 'class-transformer';
import { PaymentRequest } from './request';
import { LnInvoice, InvoiceParam } from './ln-invoice';

type UnpaidInvoiceParam =
  Omit<InvoiceParam, 'occured'> & {
    payReq: PaymentRequest,
    expires: Date
  };

export default class UnpaidInvoice extends LnInvoice {
  override readonly occured!: boolean;

  @Type(() => PaymentRequest)
  readonly payReq!: UnpaidInvoiceParam['payReq'];

  readonly expires!: UnpaidInvoiceParam['expires'];

  constructor(data: UnpaidInvoiceParam) {
    if (!data) {
      super(undefined as unknown as InvoiceParam);
      return;
    }
    super({ ...data, occured: false });
    this.expires = data.expires;
    this.payReq = data.payReq;
  }

  get isPayable() {
    return this.expires.getTime() > Date.now();
  }
}

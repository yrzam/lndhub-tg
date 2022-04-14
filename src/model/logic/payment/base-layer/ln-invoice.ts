// invoice is an off-chain tx and may contain description

import { Tx, BaseTx } from './tx';

export type InvoiceParam =
  Omit<BaseTx, 'type'> & {
    description?: string,
  };

export class LnInvoice extends Tx {
  readonly description?;

  constructor(data: InvoiceParam) {
    if (!data) {
      super(undefined as unknown as BaseTx);
      return;
    }
    super({ ...data, type: 'offchain' });

    this.description = data.description;
  }
}

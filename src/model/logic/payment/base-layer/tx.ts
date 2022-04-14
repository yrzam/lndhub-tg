import { Type } from 'class-transformer';
import { Amount } from '../../currency';

export type BaseTx = {
  type: 'onchain' | 'offchain',
  occured?: boolean,
  direction?: 'receive' | 'send',
  amount: Amount,
  time: Date,
};

export class Tx {
  readonly type!: BaseTx['type'];

  readonly occured? : BaseTx['occured'];

  readonly direction? : BaseTx['direction'];

  @Type(() => Amount)
  readonly amount!: BaseTx['amount'];

  readonly time!: BaseTx['time'];

  constructor(txData: BaseTx) {
    if (!txData) return;
    this.type = txData.type;
    if (txData.occured) this.occured = txData.occured;
    if (txData.direction) this.direction = txData.direction;
    this.amount = txData.amount;
    this.time = txData.time;
  }
}

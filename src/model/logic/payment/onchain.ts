import { Tx, BaseTx } from './tx';

type OnchainParam = Omit<BaseTx, 'type'> & {
  confCount?: number
};

export default class OnchainTx extends Tx {
  readonly confCount? : OnchainParam['confCount'];

  constructor(data: OnchainParam) {
    if (!data) {
      super(undefined as unknown as BaseTx);
      return;
    }
    super({ ...data, type: 'onchain' });

    if (data.confCount) this.confCount = data.confCount;
  }
}

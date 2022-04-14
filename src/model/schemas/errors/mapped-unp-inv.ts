import type { WalletError } from '@model';

type Data = {
  publicId?: string,
  type: 'createFailed' | 'paymentFailed'
  walletError: WalletError
} | {
  publicId: string,
  type: 'getInfoFailed'
  getInfoError:
  | 'notFound' | 'unpayable'
  | 'noBoundDestWallet' | 'alreadyChecked',
};

export default class MappedUnpInvError extends Error {
  readonly data: Data;

  constructor(
    message: string,
    data: Data,
  ) {
    super(message);
    this.data = data;
  }

  static throwGetInfoFailed(
    key: Extract<Data, { type: 'getInfoFailed' }>['getInfoError'],
    publicId: string,
  ) : never {
    throw new MappedUnpInvError(`getInfoFailed: ${key}`, {
      publicId,
      type: 'getInfoFailed',
      getInfoError: key,
    });
  }
}

type Data = {
  type:
  | 'unknown' | 'reqInvalid' | 'serverError'
  | 'ansInvalid' | 'noConnection' | 'rateLimited';
  serverError?: {
    code: number,
    key:
    | 'unknown' | 'badAuth' | 'lowBalance'
    | 'badPartner' | 'invalidInvoice' | 'prevInTransit'
    | 'paymentFailed' | 'hubShutdown'
  }
};

export default class WalletError extends Error {
  readonly data!: Data;

  constructor(
    message: string,
    type: Data['type'],
    serverErrorCode?: number,
  ) {
    super(message);
    let serverErrorKey: Exclude<Data['serverError'], undefined>['key'];
    switch (serverErrorCode) {
      case 1:
        serverErrorKey = 'badAuth';
        break;
      case 2:
        serverErrorKey = 'lowBalance';
        break;
      case 3:
        serverErrorKey = 'badPartner';
        break;
      case 4:
        serverErrorKey = 'invalidInvoice';
        break;
      case 9:
        serverErrorKey = 'prevInTransit';
        break;
      case 10:
        serverErrorKey = 'paymentFailed';
        break;
      case 11:
        serverErrorKey = 'hubShutdown';
        break;
      default:
        serverErrorKey = 'unknown';
        break;
    }
    this.data = {
      type,
      ...(serverErrorCode ? {
        serverError: {
          code: serverErrorCode,
          key: serverErrorKey,
        },
      } : {}),
    };
  }
}

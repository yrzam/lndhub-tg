type Data = {
  type: 'unknown' | 'reqInvalid' | 'ansInvalid' | 'noConnection' | 'rateLimited';
} | {
  type: 'serverError'
  serverError: {
    code: number,
    key:
    | 'unknown' | 'badAuth' | 'lowBalance'
    | 'badPartner' | 'invalidInvoice' | 'backendError'
    | 'badArgs' | 'prevInTransit' | 'paymentFailed' | 'hubShutdown'
  }
};

export default class WalletError extends Error {
  readonly data: Data;

  constructor(
    message: string,
    type: Data['type'],
    serverErrorCode?: number,
  ) {
    super(message);
    if (type !== 'serverError') this.data = { type };
    else {
      let serverErrorKey: Extract<Data, { type: 'serverError' }>['serverError']['key'];
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
        case 6: case 7:
          serverErrorKey = 'backendError';
          break;
        case 8:
          serverErrorKey = 'badArgs';
          break;
        case 9:
          serverErrorKey = 'prevInTransit';
          break;
        case 5: case 10:
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
        type: 'serverError',
        serverError: {
          code: serverErrorCode || -1,
          key: serverErrorKey,
        },
      };
    }
  }
}

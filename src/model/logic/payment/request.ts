import PayReqError from '../../schemas/errors/payreq';

type ReqType = 'ln' | 'btc' | 'other';

export class PaymentRequest {
  readonly str: string;

  readonly type: ReqType;

  constructor(str: string, type: ReqType) {
    this.str = PaymentRequest.transform(str, type);
    this.type = type;
  }

  static transform(req: string, type: ReqType) {
    let str = req;
    if (type === 'ln') {
      if (str.startsWith('lightning:')) {
        str = str.substring('lightning:'.length);
      }
      if (!str.startsWith('ln')) {
        throw new PayReqError('Invalid payment request', 'ln', str);
      }
    }
    return str;
  }
}

export { PayReqError };

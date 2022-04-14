export default class PayReqError extends Error {
  readonly reqType;

  readonly req;

  constructor(
    type: 'btc' | 'ln' | 'other',
    req: string,
  ) {
    super(`Invalid payReq. Type=${type}`);
    this.reqType = type;
    this.req = req;
  }
}

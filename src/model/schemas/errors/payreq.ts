export default class PayReqError extends Error {
  readonly reqType;

  readonly req;

  constructor(
    message: string,
    type: 'btc' | 'ln' | 'other',
    req: string,
  ) {
    super(message);
    this.reqType = type;
    this.req = req;
  }
}

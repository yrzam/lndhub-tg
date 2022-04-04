import { Currency, SAT } from './interfaces';

export default class Amount {
  private sat: number;

  constructor(num: number, currency: Currency = SAT) {
    this.sat = currency.inSats * num;
  }

  add(other?: Amount): Amount {
    return new Amount(this.sat + (other?.sat || 0));
  }

  subtr(other?: Amount): Amount {
    return new Amount(this.sat - (other?.sat || 0));
  }

  mult(num: number): Amount {
    return new Amount(this.sat * num);
  }

  div(num: number): Amount {
    return new Amount(this.sat / num);
  }

  get(currency: Currency = SAT) {
    return Math.round(this.sat) / currency.inSats;
  }
}

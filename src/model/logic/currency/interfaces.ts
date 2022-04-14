import type { Cache } from 'cache-manager';

type Sats = number;
export type CurrencyApiObj = Record<string, Sats>;

export type Currency = {
  id: string,
  inSats: Sats
};

export interface ICurrencyAPI {
  getRates(): Promise<CurrencyApiObj>;
}

export const SAT: Currency = {
  id: 'SAT',
  inSats: 1,
};

export class CurrencyService {
  private api: ICurrencyAPI;

  private cache: {
    api: Cache,
    ttl: number
  };

  constructor(params: {
    api: ICurrencyAPI,
    cache: {
      api: Cache,
      ttl: number
    }
  }) {
    this.api = params.api;
    this.cache = params.cache;
  }

  async getById(id: Currency['id']): Promise<Currency> {
    if (id === SAT.id) return SAT;
    const inSats = (await this.rates)[id];
    if (!inSats) throw new Error('Currency not found');
    return { id, inSats };
  }

  get rates(): Promise<CurrencyApiObj> {
    return this.cache.api.wrap(
      'currencies',
      async () => {
        const rates = await this.api.getRates();
        rates[SAT.id] = SAT.inSats;
        return rates;
      },
      { ttl: this.cache.ttl },
    );
  }

  get currencies(): Promise<Array<string>> {
    return this.rates.then((rates) => Object.keys(rates));
  }
}

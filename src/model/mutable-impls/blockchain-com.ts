import fetch from 'node-fetch';
import winston from 'winston';
import { z } from 'zod';
import { CurrencyAPI, CurrencyApiObj } from '../logic/currency/interfaces';

const prs = z.record(
  z.object({
    last: z.number().positive(),
  }),
).transform((rec) => {
  const obj: Record<string, number> = {};
  Object.entries(rec).forEach(([k, v]) => { obj[k] = 100000000 / v.last; });
  return obj;
});

export default class BlockchainCom implements CurrencyAPI {
  async getRates(): Promise<CurrencyApiObj> {
    winston.debug('Obtaining exchange rates from blockchain.info...');
    return fetch('https://blockchain.info/ticker')
      .then((res) => res.json())
      .then((res) => prs.parse(res));
  }
}

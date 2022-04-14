import winston from 'winston';
import fs from 'fs';
import { Parser } from 'expr-eval';
import { findBestMatch } from 'string-similarity';
import InputError from '@tg/bot/utils/input-error';
import {
  Amount, currencyService, Currency, SAT,
} from '../model';
import { i18n } from './i18n-service';

export type ParsedAmount = {
  rawNum: number,
  currency: Currency,
  amount: Amount,
  biasApplied: boolean,
  comment: string | undefined
};

export type Preferences = {
  currency: string
  fiatMult: number
};

export class AmountParser {
  static async parse(str: string, preferences: Preferences, locale: string): Promise<ParsedAmount> {
    winston.debug('Parsing request %s with preferences %s', str, preferences);
    const expr = str.split(/\p{L}/u, 1)[0];
    if (!expr) throw new InputError('noExpr');
    let num;
    try {
      num = Parser.parse(expr).evaluate();
      if (!(num >= 1) || num === Infinity) throw new InputError('wrongRange');
    } catch (err) { throw new InputError('invalidExpr'); }
    const currAndComment = str.substring(expr.length).trim().split(/ (.*)/);
    const currId = this.findCurr(currAndComment[0] || preferences.currency, locale)
      || preferences.currency;
    let comment = currAndComment[1]?.trim() ? currAndComment[1].trim() : undefined;
    if (comment) comment = comment.charAt(0).toUpperCase() + comment.slice(1);
    winston.debug('%s -> rawnum=%s, currid=%s, comment=%s', str, num, currId, comment);
    const currency = await currencyService.getById(currId);

    return {
      rawNum: num,
      currency,
      amount: currency.id === SAT.id
        ? new Amount(num, currency)
        : new Amount(num, currency).mult(preferences.fiatMult),
      biasApplied: currency.id !== SAT.id,
      comment,
    };
  }

  // Map of records alias: curr code for every language
  private static currMappings: Map<string, Record<string, string>> = (() => {
    const codes: Array<string> = Array.from(
      JSON.parse(
        fs.readFileSync('./res/currency-codes.json', 'utf-8').toUpperCase(),
      ),
    );
    const map = new Map();
    i18n.availableLocales().forEach((locale) => {
      const current: Record<string, string> = {};
      const recs = i18n.t(locale, 'currencies.extraAliases')
        .split('\n').filter((el) => el)
        .map((el) => el.split(': '));
      codes.forEach((code) => { current[code] = code; });
      winston.debug('Locale %s: base curr codes assigned', locale);
      recs.forEach((rec) => {
        if (!rec[0] || !rec[1]) throw new Error('Failed to parse currency extraAliases');
        const code = rec[0];
        const aliases = rec[1].split(', ').filter((el) => el);
        aliases.forEach((el) => { if (codes.includes(code)) current[el.toUpperCase()] = code; });
      });
      winston.debug('Loaded currency aliases for locale %s', locale);
      map.set(locale, current);
    });
    return map;
  })();

  private static findCurr(str: string, locale: string) : string | undefined {
    const mappings = this.currMappings.get(locale);
    if (!mappings) return undefined;
    return mappings[findBestMatch(str.toUpperCase(), Object.keys(mappings)).bestMatch.target];
  }
}

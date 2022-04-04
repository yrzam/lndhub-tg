import { Amount, currencyService as rates, SAT } from '../model';
import { Preferences } from './amount-parser';

export default class AmountPresenter {
  static async convert(
    amount: Amount,
    preferences: Preferences,
  ): Promise<number> {
    const realAmount = preferences.currency === SAT.id
      ? amount
      : amount.mult(preferences.createInvoFiatMultiplier);
    return realAmount.get(await rates.getById(preferences.currency));
  }
}

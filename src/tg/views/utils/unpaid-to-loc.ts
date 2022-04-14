import { UnpaidInvoice } from '@model';
import { CustomCtx } from '@tg/bot';
import AmountPresenter from '@utils/amount-presenter';
import { esc, tOrKey } from '@utils/i18n-service';
import { readableBias, readableNum } from './format-number';

export default async function unpaidToLoc(invoice: UnpaidInvoice, ctx: CustomCtx) {
  return {
    num: readableNum(await AmountPresenter.convert(invoice.amount, ctx.session.pref)),
    currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
    amount: ctx.session.pref.currency === 'SAT' ? '' : readableNum(invoice.amount.get()),
    bias: readableBias(ctx.session.pref.fiatMult, ctx.session.pref.currency !== 'SAT') || '',
    description: esc(invoice.description || ''),
    created: invoice.time.toLocaleString(ctx.i18n.locale()),
    expires: invoice.expires.toLocaleString(ctx.i18n.locale()),
  };
}

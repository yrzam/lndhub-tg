import { InlineKeyboard } from 'grammy';
import AmountPresenter from '@utils/amount-presenter';
import { esc, tOrKey } from '@utils/i18n-service';
import { WalletPublicData } from '@tg/controllers/utils/wallets';
import { Amount, LnInvoice } from '@model/.';
import type { CustomCtx } from '@tg/bot';
import { readableNum } from '../utils/format-number';

const Send = {
  prompt: async (ctx: CustomCtx) => {
    await ctx.util.tReply('send.prompt', { reply_markup: { remove_keyboard: true } });
  },
  pending: async (ctx: CustomCtx) => {
    await ctx.replyWithChatAction('typing');
  },
  askLnConfirm: async (ctx: CustomCtx, data: {
    wallet: WalletPublicData,
    invoice: LnInvoice
  }) => {
    await ctx.reply(ctx.i18n.t('send.qLnConfirm', {
      wallet: esc(data.wallet.name),
      num: readableNum(await AmountPresenter.convert(data.invoice.amount, ctx.session.pref)),
      currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
      amount: ctx.session.pref.currency === 'SAT' ? '' : readableNum(data.invoice.amount.get()),
      description: esc(data.invoice.description || ''),
      created: data.invoice.time.toLocaleString(ctx.i18n.locale()),
    }), {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('send.buttons.cancel'), 'send-ln-cancel')
        .text(ctx.i18n.t('send.buttons.pay'), 'send-ln-confirm'),
    });
  },
  lnExpired: async (ctx: CustomCtx, data: LnInvoice) => {
    await ctx.reply(ctx.i18n.t('send.lnExpired', {
      num: readableNum(await AmountPresenter.convert(data.amount, ctx.session.pref)),
      currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
      amount: ctx.session.pref.currency === 'SAT' ? '' : readableNum(data.amount.get()),
      description: esc(data.description || ''),
      created: data.time.toLocaleString(ctx.i18n.locale()),
    }));
  },
  editToStatus: async (ctx: CustomCtx, data: 'confirmed' | 'declined') => {
    await ctx.util.tUpdateText(`send.${data}`);
  },
  paid: async (ctx: CustomCtx, data : { amountSat: number }) => {
    await ctx.reply(ctx.i18n.t('send.paid', {
      num: readableNum(await AmountPresenter.convert(new Amount(data.amountSat), ctx.session.pref)),
      currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
    }));
  },
};

export default Send;

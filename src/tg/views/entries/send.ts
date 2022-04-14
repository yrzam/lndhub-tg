import { InlineKeyboard } from 'grammy';
import { esc } from '@utils/i18n-service';
import { WalletPublicData } from '@tg/controllers/utils/wallets';
import { UnpaidInvoice } from '@model';
import type { CustomCtx } from '@tg/bot';
import { cb } from '@tg/constants';
import unpaidToLoc from '../utils/unpaid-to-loc';

const Send = {

  prompt: async (ctx: CustomCtx) => {
    await ctx.util.tReply('send.prompt', { reply_markup: { remove_keyboard: true } });
  },

  pending: async (ctx: CustomCtx) => {
    await ctx.replyWithChatAction('typing');
  },

  askLnConfirm: async (ctx: CustomCtx, data: {
    wallet: WalletPublicData,
    invoice: UnpaidInvoice
  }) => {
    await ctx.reply(ctx.i18n.t('send.qLnConfirm', {
      wallet: esc(data.wallet.name),
      ...await unpaidToLoc(data.invoice, ctx),
    }), {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('send.buttons.cancel'), cb.send.lnDecline)
        .text(ctx.i18n.t('send.buttons.pay'), cb.send.lnConfirm),
    });
  },

  lnExpired: async (ctx: CustomCtx, data: UnpaidInvoice) => {
    await ctx.reply(ctx.i18n.t('send.lnExpired', await unpaidToLoc(data, ctx)));
  },

  editToStatus: async (ctx: CustomCtx, data: 'confirmed' | 'declined') => {
    await ctx.util.tUpdateText(`send.${data}`);
  },

  paid: async (ctx: CustomCtx, data: UnpaidInvoice) => {
    await ctx.reply(ctx.i18n.t('send.paid', await unpaidToLoc(data, ctx)));
  },

};

export default Send;

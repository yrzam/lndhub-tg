import { InputFile, Keyboard, InlineKeyboard } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import { esc, tOrKey } from '@utils/i18n-service';
import { ParsedAmount } from '@utils/amount-parser';
import { WalletPublicData } from '@tg/controllers/utils/wallets';
import { readableNum, readableBias } from '../utils/format-number';

const Receive = {
  askBtcOrLnOrLnCustom: async (ctx: CustomCtx) => {
    await ctx.util.tReply('receive.qBtcOrLnOrLnCustom', {
      reply_markup: {
        keyboard: new Keyboard()
          .text(ctx.i18n.t('receive.buttons.ln')).row()
          .text(ctx.i18n.t('receive.buttons.btc'))
          .text(ctx.i18n.t('receive.buttons.lnCustom'))
          .row()
          .text(ctx.i18n.t('basic.cancelButton'))
          .build(),
        resize_keyboard: true,
      },
    });
  },
  btc: async (ctx: CustomCtx, data: { addr: string, qr: Buffer }) => {
    await ctx.replyWithPhoto(new InputFile(data.qr), {
      caption: ctx.i18n.t('receive.btc', { address: esc(data.addr) }),
      reply_markup: {
        keyboard: new Keyboard().text(ctx.i18n.t('basic.doneButton')).build(),
        resize_keyboard: true,
      },
    });
  },
  askLnAmount: async (ctx: CustomCtx) => {
    await ctx.reply(ctx.i18n.t('receive.qLnAmount', {
      currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
    }));
  },
  askLnDescription: async (ctx: CustomCtx) => {
    await ctx.util.tReply('receive.qLnDescription', { reply_markup: { remove_keyboard: true } });
  },
  askLnConfirmAmount: async (
    ctx: CustomCtx,
    data: {
      reqData: ParsedAmount,
      wallet: WalletPublicData
    },
  ) => {
    const biasPercent = readableBias(
      ctx.session.pref.createInvoFiatMultiplier,
      data.reqData.biasApplied,
    );
    await ctx.reply(ctx.i18n.t('receive.qLnConfirm', {
      wallet: esc(data.wallet.name),
      num: readableNum(data.reqData.rawNum),
      amount: data.reqData.currency.id === 'SAT' ? '' : readableNum(data.reqData.amount.get()),
      currency: tOrKey(ctx.i18n, `currencies.list.${data.reqData.currency.id}`),
      bias: biasPercent || '',
      comment: esc(data.reqData.comment || ''),
    }), {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('receive.buttons.no'), 'receive-ln-decline')
        .text(ctx.i18n.t('receive.buttons.yes'), 'receive-ln-confirm'),
    });
  },
  ln: async (ctx: CustomCtx, data: { payReq: string, qr: Buffer, desc: string }) => {
    await ctx.replyWithPhoto(new InputFile(data.qr), {
      caption: ctx.i18n.t('receive.ln', {
        payReq: esc(data.payReq),
        description: esc(data.desc),
      }),
      reply_markup: {
        keyboard: new Keyboard().text(ctx.i18n.t('basic.doneButton')).build(),
        resize_keyboard: true,
      },
    });
  },
  editToStatus: async (ctx: CustomCtx, data: 'confirmed' | 'declined') => {
    await ctx.util.updateText(ctx.i18n.t(`receive.${data}`));
  },
};

export default Receive;

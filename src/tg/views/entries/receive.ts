import { InputFile, Keyboard, InlineKeyboard } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import { esc, tOrKey } from '@utils/i18n-service';
import { ParsedAmount } from '@utils/amount-parser';
import { WalletPublicData } from '@tg/controllers/utils/wallets';
import { cb } from '@tg/constants';
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
    await ctx.reply(ctx.i18n.t('receive.qLnConfirm', {
      wallet: esc(data.wallet.name),
      num: readableNum(data.reqData.rawNum),
      amount: data.reqData.currency.id === 'SAT' ? '' : readableNum(data.reqData.amount.get()),
      currency: tOrKey(ctx.i18n, `currencies.list.${data.reqData.currency.id}`),
      bias: readableBias(ctx.session.pref.fiatMult, data.reqData.biasApplied) || '',
    }), {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('receive.buttons.no'), cb.receive.lnDecline)
        .text(ctx.i18n.t('receive.buttons.yes'), cb.receive.lnConfirm).row()
        .switchInline(
          ctx.i18n.t('receive.buttons.alsoTryInline'),
          `${data.reqData.rawNum} ${data.reqData.currency.id} ${data.reqData.comment}`,
        ),
    });
  },

  ln: async (ctx: CustomCtx, data: { payReq: string, qr: Buffer, desc?: string }) => {
    await ctx.replyWithPhoto(new InputFile(data.qr), {
      caption: ctx.i18n.t('receive.ln', {
        payReq: esc(data.payReq),
        description: esc(data.desc || ''),
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

import { Keyboard } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import { esc } from '@utils/i18n-service';

const AddWallet = {

  askCreateOrImport: async (ctx: CustomCtx, data: { allowCancel: boolean }) => {
    let kb = new Keyboard()
      .text(ctx.i18n.t('addWallet.buttons.create'))
      .text(ctx.i18n.t('addWallet.buttons.import')).row();
    if (data.allowCancel) kb = kb.text(ctx.i18n.t('basic.cancelButton'));
    await ctx.util.tReply('addWallet.qCreateOrImport', {
      reply_markup: {
        keyboard: kb.build(),
        resize_keyboard: true,
      },
    });
  },

  askCreateDefaultOrCustom: async (ctx: CustomCtx) => {
    await ctx.util.tReply('addWallet.qCreateDefaultOrCustom', {
      reply_markup: {
        keyboard: new Keyboard()
          .text(ctx.i18n.t('addWallet.buttons.defaultHost'))
          .text(ctx.i18n.t('addWallet.buttons.customHost')).row()
          .text(ctx.i18n.t('basic.cancelButton'))
          .build(),
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  },

  askCreateCustomUrl: async (ctx: CustomCtx) => {
    await ctx.util.tReply('addWallet.qCreateCustomUrl', {
      reply_markup: { remove_keyboard: true },
    });
  },

  askImportUrl: async (ctx: CustomCtx) => {
    await ctx.util.tReply('addWallet.qImportUrl', {
      reply_markup: { remove_keyboard: true },
    });
  },

  pending: async (ctx: CustomCtx, data: { verbose: boolean }) => {
    if (data.verbose) await ctx.util.tReply('addWallet.pending');
    else await ctx.replyWithChatAction('typing');
  },

  chooseName: async (ctx: CustomCtx) => {
    await ctx.util.tReply('addWallet.qName', {
      reply_markup: { remove_keyboard: true },
    });
  },

  saveKey: async (ctx: CustomCtx, data: { backup: string }) => {
    await ctx.reply(ctx.i18n.t('addWallet.saveKey', { backup: esc(data.backup) }), {
      reply_markup: {
        keyboard: new Keyboard()
          .text(ctx.i18n.t('addWallet.buttons.keySaved'))
          .build(),
        resize_keyboard: true,
      },
    });
  },

};

export default AddWallet;

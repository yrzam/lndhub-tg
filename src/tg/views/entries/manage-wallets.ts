import { InlineKeyboard, Keyboard } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import type { WalletPublicData } from '@tg/controllers/utils/wallets';
import { esc } from '@utils/i18n-service';
import { cb, cbPrefixes } from '@tg/constants';

type Ctx = CustomCtx & {
  state: {
    msgToEdit?: number | undefined
  }
};

const ManageWallets = {

  list: async (ctx: Ctx, data: {
    action: 'send' | 'edit'
    list: Array<WalletPublicData>
    active: WalletPublicData
  }) => {
    let kb = new InlineKeyboard();
    data.list.forEach((el) => {
      kb = kb.text(
        el.id === data.active.id ? `✅ ${el.name} ✅` : el.name,
        cbPrefixes.manage.item + el.id,
      ).row();
    });
    kb = kb.text(ctx.i18n.t('manageWallets.buttons.new'), cb.manage.addWallet);
    const msg = await ctx.util.updateTextOrReply(
      data.action,
      ctx.i18n.t('manageWallets.list'),
      { reply_markup: kb },
    );
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    if (data.action === 'send') ctx.state.msgToEdit = msg?.message_id;
  },

  item: async (ctx: Ctx, data: WalletPublicData & {
    isActive: boolean
    action: 'send' | 'edit'
  }) => {
    let kb = new InlineKeyboard();
    if (!data.isActive) {
      kb = kb.text(ctx.i18n.t('manageWallets.buttons.makeActive'), cb.manage.active).row();
    }
    kb = kb.text(ctx.i18n.t('manageWallets.buttons.rename'), cb.manage.rename)
      .text(ctx.i18n.t('manageWallets.buttons.delete'), cb.manage.delete)
      .row()
      .text(ctx.i18n.t('manageWallets.buttons.saveKey'), cb.manage.backup)
      .row();
    if (data.sortPriority && ctx.wallets.count > 1) {
      kb = kb.text(
        ctx.i18n.t('manageWallets.buttons.resetPrior'),
        cb.manage.resetPrior,
      ).row();
    }
    kb = kb.text(ctx.i18n.t('manageWallets.buttons.back'), cb.manage.list);
    const msg = await ctx.util.updateTextOrReply(
      data.action,
      ctx.i18n.t('manageWallets.item', {
        name: esc(data.name),
        hubUrl: esc(data.hubUrl),
        id: data.id,
        isActive: data.isActive ? 'true' : '',
      }),
      { reply_markup: kb, disable_web_page_preview: true },
    );
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    if (data.action === 'send') ctx.state.msgToEdit = msg?.message_id;
  },

  askDeleteConfirm: async (ctx: Ctx, data: WalletPublicData) => {
    await ctx.util.updateText(ctx.i18n.t(
      'manageWallets.qDeleteConf',
      { wallet: esc(data.name) },
    ), {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('manageWallets.buttons.no'), cb.manage.backToItem)
        .text(ctx.i18n.t('manageWallets.buttons.yes'), cb.manage.deleteConf),
    });
    await ctx.answerCallbackQuery();
  },

  rename: async (ctx: Ctx, data: WalletPublicData) => {
    await ctx.util.delete();
    await ctx.reply(ctx.i18n.t('manageWallets.qNewName', { wallet: esc(data.name) }), {
      reply_markup: { remove_keyboard: true },
    });
  },

  backup: async (ctx: Ctx, data: WalletPublicData & { backup: string }) => {
    await ctx.util.updateText(ctx.i18n.t(
      'manageWallets.saveKey',
      { backup: esc(data.backup) },
    ), {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('manageWallets.buttons.back'), cb.manage.backToItem),
      disable_web_page_preview: true,
    });
    await ctx.answerCallbackQuery();
  },

  exitUi: async (ctx: Ctx) => {
    if (ctx.chat?.id && ctx.state.msgToEdit) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        ctx.state.msgToEdit,
        ctx.i18n.t('manageWallets.editDone'),
      );
    }
  },

  readyUi: async (ctx: Ctx) => {
    await ctx.util.tReply('manageWallets.readyUiMsg', {
      reply_markup: {
        keyboard: new Keyboard().text(ctx.i18n.t('basic.doneButton')).build(),
        resize_keyboard: true,
      },
    });
  },

};

export default ManageWallets;

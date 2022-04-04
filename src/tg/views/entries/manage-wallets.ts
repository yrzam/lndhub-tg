import { InlineKeyboard, Keyboard } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import type { WalletPublicData } from '@tg/controllers/utils/wallets';
import { esc } from '@utils/i18n-service';

const ManageWallets = {
  list: async (ctx: CustomCtx, data: {
    action: 'send' | 'edit'
    list: Array<WalletPublicData>
    active: WalletPublicData
  }) => {
    let kb = new InlineKeyboard();
    data.list.forEach((el) => {
      kb = kb.text(el.id === data.active.id ? `✅ ${el.name} ✅` : el.name, `manage-item-${el.id}`)
        .row();
    });
    kb = kb.text(ctx.i18n.t('manageWallets.buttons.new'), 'manage-addwallet');
    const msg = await ctx.util.updateTextOrReply(
      data.action || 'edit',
      ctx.i18n.t('manageWallets.list'),
      { reply_markup: kb },
    );
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    if (data.action === 'send') ctx.state['msgToEdit'] = msg?.message_id;
  },
  item: async (ctx: CustomCtx, data: WalletPublicData & {
    isActive: boolean
    action?: 'send' | 'edit'
  }) => {
    let kb = new InlineKeyboard();
    if (!data.isActive) {
      kb = kb.text(ctx.i18n.t('manageWallets.buttons.makeActive'), 'manage-activ').row();
    }
    kb = kb.text(ctx.i18n.t('manageWallets.buttons.rename'), 'manage-rename')
      .text(ctx.i18n.t('manageWallets.buttons.delete'), 'manage-delete')
      .row()
      .text(ctx.i18n.t('manageWallets.buttons.saveKey'), 'manage-backup')
      .row();
    if (data.sortPriority) {
      kb = kb.text(ctx.i18n.t('manageWallets.buttons.resetPrior'), 'manage-resetprior').row();
    }
    kb = kb.text(ctx.i18n.t('manageWallets.buttons.back'), 'manage-list');
    const msg = await ctx.util.updateTextOrReply(
      data.action || 'edit',
      ctx.i18n.t('manageWallets.item', {
        name: esc(data.name),
        hubUrl: esc(data.hubUrl),
        id: data.id,
        isActive: data.isActive ? 'true' : '',
      }),
      { reply_markup: kb, disable_web_page_preview: true },
    );
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    if (data.action === 'send') ctx.state['msgToEdit'] = msg?.message_id;
  },
  askDeleteConfirm: async (ctx: CustomCtx, data: WalletPublicData) => {
    await ctx.util.updateText(ctx.i18n.t('manageWallets.qDeleteConf', { wallet: esc(data.name) }), {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('manageWallets.buttons.no'), 'manage-backtoitem')
        .text(ctx.i18n.t('manageWallets.buttons.yes'), 'manage-deleteconf'),
    });
    await ctx.answerCallbackQuery();
  },
  rename: async (ctx: CustomCtx, data: WalletPublicData) => {
    await ctx.util.delete();
    await ctx.reply(ctx.i18n.t('manageWallets.qNewName', { wallet: esc(data.name) }), {
      reply_markup: { remove_keyboard: true },
    });
  },
  backup: async (ctx: CustomCtx, data: WalletPublicData & { backup: string }) => {
    await ctx.util.updateText(ctx.i18n.t('manageWallets.saveKey', { backup: esc(data.backup) }), {
      reply_markup: new InlineKeyboard().text(ctx.i18n.t('manageWallets.buttons.back'), 'manage-backtoitem'),
      disable_web_page_preview: true,
    });
    await ctx.answerCallbackQuery();
  },
  exitUi: async (ctx: CustomCtx) => {
    if (ctx.chat?.id && typeof ctx.state['msgToEdit'] === 'number') {
      await ctx.api.editMessageText(ctx.chat.id, ctx.state['msgToEdit'], ctx.i18n.t('manageWallets.editDone'));
    }
  },
  readyUi: async (ctx: CustomCtx) => {
    await ctx.util.tReply('manageWallets.readyUiMsg', {
      reply_markup: {
        keyboard: new Keyboard().text(ctx.i18n.t('basic.doneButton')).build(),
        resize_keyboard: true,
      },
    });
  },
};

export default ManageWallets;

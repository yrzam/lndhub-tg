import { InlineKeyboard, Keyboard } from 'grammy';
import { currencyService } from '@model';
import type { CustomCtx } from '@tg/bot';
import { cb, cbPrefixes } from '@tg/constants';
import { tOrKey } from '@utils/i18n-service';
import { readableBias } from '../utils/format-number';

type Ctx = CustomCtx & {
  state: {
    msgToEdit?: number | undefined
  }
};

const Settings = {

  main: async (ctx: Ctx, data: 'send' | 'edit') => {
    let currStr = tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`);
    if (currStr !== ctx.session.pref.currency) currStr += ` (${ctx.session.pref.currency})`;
    const msg = await ctx.util.updateTextOrReply(data, ctx.i18n.t('settings.main', {
      language: tOrKey(ctx.i18n, `languages.${ctx.i18n.locale()}`),
      currency: currStr,
      biasPercent: `${readableBias(ctx.session.pref.fiatMult, true) || 0}%`,
    }), {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('settings.buttons.language'), cb.settings.lang)
        .text(ctx.i18n.t('settings.buttons.currency'), cbPrefixes.settings.currPage).row()
        .text(ctx.i18n.t('settings.buttons.bias'), cb.settings.bias),
    });
    if (data === 'send') ctx.state.msgToEdit = msg?.message_id;
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  },

  language: async (ctx: Ctx) => {
    let kb = new InlineKeyboard();
    Object.keys(ctx.i18n.repository).forEach((el, i) => {
      const str = tOrKey(ctx.i18n, `languages.${el}`);
      kb = kb.text(ctx.i18n.locale() === el ? `✅ ${str} ✅` : str, cbPrefixes.settings.setLang + el);
      if ((i + 1) % 2 === 0 || i === Object.keys(ctx.i18n.repository).length - 1) kb = kb.row();
    });
    await ctx.util.updateText(ctx.i18n.t('settings.qLanguage'), {
      reply_markup: kb.text(ctx.i18n.t('settings.buttons.back'), cb.settings.main),
    });
    await ctx.answerCallbackQuery();
  },

  currency: async (ctx: Ctx, data: { page: number }) => {
    const elOnPage = 37; // 1 + 9*4

    let kb = new InlineKeyboard();
    let allCurrs = await currencyService.currencies;
    const current = allCurrs.findIndex((el) => el === ctx.session.pref.currency);
    if (current !== -1 && allCurrs.length) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      allCurrs = [allCurrs[current]!, ...allCurrs.filter((_, i) => i !== current)];
    }
    const currs = allCurrs.slice(data.page * elOnPage, (data.page + 1) * elOnPage);
    // kb
    let colN = 0;
    currs.forEach((el, i) => {
      kb = kb.text(
        el === ctx.session.pref.currency ? `✅ ${el} ✅` : el,
        cbPrefixes.settings.setCurr + el,
      );
      colN += 1;
      if (colN === 4 || el === ctx.session.pref.currency || i === currs.length - 1) {
        kb = kb.row();
        colN = 0;
      }
    });
    // prev-next btns
    if (currs.length !== allCurrs.length) {
      if (data.page !== 0) {
        kb = kb.text('⬅️', cbPrefixes.settings.currPage + (data.page - 1));
      } else kb = kb.text(' ');
      if (data.page * elOnPage + currs.length < allCurrs.length) {
        kb = kb.text('➡️', cbPrefixes.settings.currPage + (data.page + 1));
      } else kb = kb.text(' ');
      kb = kb.row();
    }

    await ctx.util.updateText(ctx.i18n.t('settings.qCurrency'), {
      reply_markup: kb.text(ctx.i18n.t('settings.buttons.back'), cb.settings.main),
    });
    await ctx.answerCallbackQuery();
  },

  changeBias: async (ctx: Ctx) => {
    await ctx.util.delete();
    await ctx.reply(ctx.i18n.t('settings.qNewBias'), {
      reply_markup: { remove_keyboard: true },
    });
  },

  readyUi: async (ctx: Ctx) => {
    await ctx.util.tReply('settings.readyUiMsg', {
      reply_markup: {
        keyboard: new Keyboard().text(ctx.i18n.t('basic.doneButton')).build(),
        resize_keyboard: true,
      },
    });
  },

  exitUi: async (ctx: Ctx) => {
    if (ctx.chat?.id && ctx.state.msgToEdit) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        ctx.state.msgToEdit,
        ctx.i18n.t('settings.editDone'),
      );
    }
  },

};

export default Settings;

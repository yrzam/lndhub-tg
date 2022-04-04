import { currencyService } from '@model/.';
import { CustomCtx } from '@tg/bot';
import { tOrKey } from '@utils/i18n-service';
import { InlineKeyboard, Keyboard } from 'grammy';
import { readableBias } from '../utils/format-number';

const Settings = {
  main: async (ctx: CustomCtx, data: 'send' | 'edit') => {
    let currStr = tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`);
    if (currStr !== ctx.session.pref.currency) currStr += ` (${ctx.session.pref.currency})`;
    const msg = await ctx.util.updateTextOrReply(data, ctx.i18n.t('settings.main', {
      language: tOrKey(ctx.i18n, `languages.${ctx.i18n.locale()}`),
      currency: currStr,
      biasPercent: `${readableBias(ctx.session.pref.createInvoFiatMultiplier, true) || 0}%`,
    }), {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('settings.buttons.language'), 'settings-language')
        .text(ctx.i18n.t('settings.buttons.currency'), 'settings-currency').row()
        .text(ctx.i18n.t('settings.buttons.bias'), 'settings-bias'),
    });
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    if (data === 'send') ctx.state['msgToEdit'] = msg?.message_id;
  },
  language: async (ctx: CustomCtx) => {
    let kb = new InlineKeyboard();
    Object.keys(ctx.i18n.repository).forEach((el, i) => {
      const str = tOrKey(ctx.i18n, `languages.${el}`);
      kb = kb.text(ctx.i18n.locale() === el ? `✅ ${str} ✅` : str, `settings-setlang-${el}`);
      if ((i + 1) % 2 === 0 || i === Object.keys(ctx.i18n.repository).length - 1) kb = kb.row();
    });
    await ctx.util.updateText(ctx.i18n.t('settings.qLanguage'), {
      reply_markup: kb.text(ctx.i18n.t('settings.buttons.back'), 'settings-main'),
    });
    await ctx.answerCallbackQuery();
  },
  currency: async (ctx: CustomCtx, data: { page: number }) => {
    const elOnPage = 37; // 1 + 9*4

    let kb = new InlineKeyboard();
    const allCurrs = await currencyService.currencies;
    const current = allCurrs.findIndex((el) => el === ctx.session.pref.currency);
    if (current !== -1 && allCurrs.length) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      [allCurrs[0], allCurrs[current]] = [allCurrs[current]!, allCurrs[0]!];
    }
    const currs = allCurrs.slice(data.page * elOnPage, (data.page + 1) * elOnPage);
    // kb
    let colN = 0;
    currs.forEach((el, i) => {
      kb = kb.text(
        el === ctx.session.pref.currency ? `✅ ${el} ✅` : el,
        `settings-setcurr-${el}`,
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
        kb = kb.text('⬅️', `settings-currency-${data.page - 1}`);
      } else kb = kb.text(' ');
      if (data.page * elOnPage + currs.length < allCurrs.length) {
        kb = kb.text('➡️', `settings-currency-${data.page + 1}`);
      } else kb = kb.text(' ');
      kb = kb.row();
    }

    await ctx.util.updateText(ctx.i18n.t('settings.qCurrency'), {
      reply_markup: kb.text(ctx.i18n.t('settings.buttons.back'), 'settings-main'),
    });
    await ctx.answerCallbackQuery();
  },
  changeBias: async (ctx: CustomCtx) => {
    await ctx.util.delete();
    await ctx.reply(ctx.i18n.t('settings.qNewBias'), {
      reply_markup: { remove_keyboard: true },
    });
  },
  readyUi: async (ctx: CustomCtx) => {
    await ctx.util.tReply('settings.readyUiMsg', {
      reply_markup: {
        keyboard: new Keyboard().text(ctx.i18n.t('basic.doneButton')).build(),
        resize_keyboard: true,
      },
    });
  },
  exitUi: async (ctx: CustomCtx) => {
    if (ctx.chat?.id && typeof ctx.state['msgToEdit'] === 'number') {
      await ctx.api.editMessageText(
        ctx.chat.id,
        ctx.state['msgToEdit'],
        ctx.i18n.t('settings.editDone'),
      );
    }
  },
};

export default Settings;

import type { CustomCtx } from '@tg/bot';
import { WalletError } from '@model/.';
import InputError from '@tg/bot/utils/input-error';

const Common = {
  walletError: async (ctx: CustomCtx, err: WalletError) => {
    const errStr = err.data.type === 'serverError'
      ? ctx.i18n.t(`errors.hubErrors.${err.data.serverError?.key}`, {
        error: err.message,
      })
      : ctx.i18n.t(`errors.${err.data.type}`, {
        error: err.message,
      });

    if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: errStr, show_alert: true });
    await ctx.reply(errStr);
  },
  inputError: async (ctx: CustomCtx, err: InputError) => {
    const str = ctx.i18n.t(`errors.inputErrors.${err.key}`, err.tData);
    if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: str, show_alert: true });
    else await ctx.reply(str);
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  noActionError: async (ctx: CustomCtx, _err: InputError) => {
    if (!ctx.message && !ctx.callbackQuery) return;
    if (ctx.callbackQuery) await ctx.answerCallbackQuery(ctx.i18n.t('errors.cbNoAction'));
    else await ctx.reply(ctx.i18n.t('errors.inputErrors.noAction'));
  },
};

export default Common;

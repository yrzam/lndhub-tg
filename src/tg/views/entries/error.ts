import type { CustomCtx } from '@tg/bot';
import { WalletError } from '@model';
import InputError from '@tg/bot/utils/input-error';
import { esc } from '@utils/i18n-service';

const Common = {

  walletError: async (ctx: CustomCtx, err: WalletError) => {
    const errStr = ctx.i18n.t(err.data.type === 'serverError'
      ? `errors.hub.${err.data.serverError.key}`
      : `errors.${err.data.type}`, { error: esc(err.message) });
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: errStr, show_alert: true })
        .catch((e) => e);
    }
    if (ctx.from?.id && ctx.chat?.id) await ctx.reply(errStr);
  },

  inputError: async (ctx: CustomCtx, err: InputError) => {
    const str = ctx.i18n.t(`errors.input.${err.key}`, err.tData);
    if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: str, show_alert: true });
    else await ctx.reply(str);
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  noActionError: async (ctx: CustomCtx, _err: InputError) => {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery(ctx.i18n.t('errors.input.cbNoAction'));
    else await ctx.util.tReply('errors.input.noAction');
  },

  unknownError: async (ctx: CustomCtx) => {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: ctx.i18n.t('errors.unknown'),
        show_alert: true,
      });
    } else await ctx.util.tReply('errors.unknown');
  },

};

export default Common;

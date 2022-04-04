import type { CustomCtx } from '../../bot';

const StaticMsg = {
  sendUnavail: async (ctx: CustomCtx) => {
    if (ctx.inlineQuery) {
      await ctx.answerInlineQuery([], {
        switch_pm_text: ctx.i18n.t('static.unavailInline'),
        switch_pm_parameter: 'inline-unavail',
      });
    } else { await ctx.util.tReply('static.unavail'); }
  },
  greeting: async (ctx: CustomCtx) => {
    await ctx.util.tReply('greeting', { disable_web_page_preview: true });
  },
};

export default StaticMsg;

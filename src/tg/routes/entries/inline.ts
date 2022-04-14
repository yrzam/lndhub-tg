import type { CustomCtx } from '@tg/bot';

// eslint-disable-next-line import/prefer-default-export
export function SimpleInlineInvoice(ctx: CustomCtx) : boolean {
  return ctx.chatTypeStr === 'inline_private' || ctx.chatTypeStr === 'normal_undefined';
}

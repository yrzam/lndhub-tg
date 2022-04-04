import type { CustomCtx } from '@tg/bot';

// eslint-disable-next-line import/prefer-default-export
export function FirstUse(ctx: CustomCtx) : boolean {
  return !!ctx.message?.text?.startsWith('/start') && !ctx.wallets.exist;
}

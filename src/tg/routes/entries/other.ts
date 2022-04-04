import type { CustomCtx } from '@tg/bot';

// eslint-disable-next-line import/prefer-default-export
export function AddWallet(ctx: CustomCtx) : boolean {
  return !ctx.wallets.exist;
}

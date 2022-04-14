import type { CustomCtx } from '@tg/bot';

export function Admin(ctx: CustomCtx): boolean {
  return !!ctx.message?.text?.startsWith('/admin');
}

export function ManageWallets(ctx: CustomCtx): boolean {
  return !!ctx.message?.text?.startsWith('/wallets')
    || !!ctx.message?.text?.startsWith('/start wallets');
}

export function Settings(ctx: CustomCtx): boolean {
  return !!ctx.message?.text?.startsWith('/settings');
}

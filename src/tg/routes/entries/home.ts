import type { CustomCtx } from '@tg/bot';

export function Home(ctx: CustomCtx): boolean {
  return ctx.chat?.type === 'private';
}
export function Receive(ctx: CustomCtx): boolean {
  return !!ctx.message?.text && !!ctx.util.tHeard('home.buttons.receive');
}

export function Send(ctx: CustomCtx): boolean {
  return !!ctx.message?.text && !!ctx.util.tHeard('home.buttons.send');
}

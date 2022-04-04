import type { CustomCtx } from '@tg/bot';
import { tMatch } from '@utils/i18n-service';

export function Receive(ctx: CustomCtx): boolean {
  return !!ctx.message?.text && !!tMatch(ctx.message.text, 'home.buttons.receive');
}

export function Send(ctx: CustomCtx): boolean {
  return !!ctx.message?.text && !!tMatch(ctx.message.text, 'home.buttons.send');
}

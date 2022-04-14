/* eslint-disable no-underscore-dangle */
import type { CustomCtx } from '@tg/bot';
import type { ControllerName } from '@tg/controllers';
import { commands } from '@tg/bot/utils/set-commands';
import { exitHandlerForCtrl } from '@tg/controllers/utils/ctrl-route-helper';

export default async function BoundCtrl(ctx: CustomCtx): Promise<undefined | ControllerName> {
  if (ctx.util.tHeard('basic.cancelButton') || ctx.message?.text?.startsWith('/start')
    || commands.some((el) => ctx.message?.text?.startsWith(`/${el}`))) {
    if (ctx.session._boundCtrls[ctx.chatTypeStr]) {
      try {
        await exitHandlerForCtrl(ctx.session._boundCtrls[ctx.chatTypeStr] as ControllerName, ctx);
        // eslint-disable-next-line no-empty
      } catch (err) {}
      delete ctx.session._boundCtrls[ctx.chatTypeStr];
    }
    ctx.session._ctrlStates[ctx.chatTypeStr] = {};
  }
  return ctx.session._boundCtrls[ctx.chatTypeStr];
}

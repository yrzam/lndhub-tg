import { BotError } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import type { ControllerName } from '@tg/controllers';
import { globalCtrlConfig } from '..';
import CommonError from '../entries/error';
import { controllers } from '../enum';

const ctrl = new CommonError(globalCtrlConfig);

export async function commonErrHandler(err: BotError<CustomCtx>) {
  await ctrl.errorHandler(err);
}

export async function exitHandlerForCtrl(ctrlName: ControllerName, ctx: CustomCtx) {
  const specCtrl = new controllers[ctrlName](globalCtrlConfig);
  specCtrl.loadState(ctx);
  await specCtrl.exitHandler(ctx);
}

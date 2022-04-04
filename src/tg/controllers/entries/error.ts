import winston from 'winston';
import { BotError } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import { WalletError } from '@model/.';
import view from '@tg/views';
import InputError from '@tg/bot/utils/input-error';
import { Controller } from '../base';

export default class CommonError extends Controller {
  override async errorHandler(err: BotError<CustomCtx>) {
    const { ctx, error } = this.flattenErr(err);
    if (!(error instanceof Error)) return;
    if (error instanceof WalletError) await view('Common.walletError', ctx, error);
    if (error instanceof InputError) {
      switch (error.key) {
        case 'noAction':
          await view('Common.noActionError', ctx, error);
          break;
        default:
          await view('Common.inputError', ctx, error);
      }
    } else winston.error('Caught common bot error: %s', error.stack);
  }

  flattenErr(err: BotError<CustomCtx>) : BotError<CustomCtx> {
    let unwrapped = err;
    while (unwrapped.error instanceof BotError) {
      unwrapped = unwrapped.error;
    }
    return unwrapped;
  }
}

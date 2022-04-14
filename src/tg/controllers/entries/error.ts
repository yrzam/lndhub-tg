import winston from 'winston';
import { BotError } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import { WalletError } from '@model';
import view from '@tg/views';
import InputError from '@tg/bot/utils/input-error';
import { Controller } from '../base';

export default class CommonError extends Controller {
  override async errorHandler(err: BotError<CustomCtx>) {
    const { ctx, error } = this.flattenErr(err);
    if (!(error instanceof Error)) return;
    if (!ctx.message && !ctx.callbackQuery) {
      winston.debug('Caught error but cannot report: %s', err.message);
      return;
    }

    if (error instanceof WalletError) {
      winston.debug('Reporting WalletError: %s', error.message);
      await view('Error.walletError', ctx, error);
    } else if (error instanceof InputError) {
      winston.debug('Reporting InputError: %s', error.message);
      switch (error.key) {
        case 'noAction':
          await view('Error.noActionError', ctx, error);
          break;
        default:
          await view('Error.inputError', ctx, error);
      }
    } else {
      winston.error('Caught common bot error: %s', error.stack);
      await view('Error.unknownError', ctx);
    }
  }

  flattenErr(err: BotError<CustomCtx>) : BotError<CustomCtx> {
    let unwrapped = err;
    while (unwrapped.error instanceof BotError) {
      unwrapped = unwrapped.error;
    }
    return unwrapped;
  }
}

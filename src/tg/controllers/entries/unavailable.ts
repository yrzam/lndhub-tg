import view from '@tg/views';
import type { CustomCtx } from '@tg/bot';
import { Controller } from '../base';

export default class UnavailNotifier extends Controller {
  override async defaultHandler(ctx: CustomCtx) {
    await view('StaticMsg.sendUnavail', ctx);
  }
}

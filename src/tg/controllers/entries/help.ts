import type { CustomCtx } from '@tg/bot';
import view from '@tg/views';
import { Controller } from '../base';

export default class Help extends Controller {
  override async defaultHandler(ctx: CustomCtx) {
    if (ctx.message?.text?.startsWith('/start') && !ctx.wallets.exist) {
      await view('StaticMsg.greeting', ctx);
      await this.reroute(ctx, 'AddWallet');
    }
  }
}

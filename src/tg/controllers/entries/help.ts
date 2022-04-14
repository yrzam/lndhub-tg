import type { CustomCtx } from '@tg/bot';
import view from '@tg/views';
import { Controller } from '../base';

export default class Help extends Controller {
  override use() {
    this.controller.command('start', async (ctx : CustomCtx) => {
      if (ctx.wallets.exist) return;
      await view('StaticMsg.greeting', ctx);
      await this.reroute(ctx, 'AddWallet');
    });
  }
}

import { CustomCtx } from '@tg/bot';
import { setCommands } from '@tg/bot/utils/set-commands';
import { Controller } from '../base';

export default class Admin extends Controller {
  override use() {
    this.controller.command('setmycommands', async (ctx) => {
      await setCommands(ctx);
    });
  }

  override async defaultHandler(ctx: CustomCtx) {
    await ctx.reply('admin', { reply_markup: { remove_keyboard: true } });
    this.useAsNext(ctx);
  }
}

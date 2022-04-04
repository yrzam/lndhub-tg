import { Router } from '@grammyjs/router';
import type { CustomCtx } from '@tg/bot';
import InputError from '@tg/bot/utils/input-error';
import view from '@tg/views';
import { tToFilt } from '@utils/i18n-service';
import { Controller } from '../base';

type State = {
  answerTo: 'name' | 'kbAction',
  opWalletId?: string
};

function expect(step: State['answerTo'], ctx: CustomCtx) {
  (ctx.state as State).answerTo = step;
}

export default class ManageWallets extends Controller {
  override use() {
    this.controller.hears(tToFilt('basic.doneButton'), async (ctx) => {
      await this.reroute(ctx, 'Home');
    });

    const kb = new Router<CustomCtx>((ctx : CustomCtx) => {
      if (ctx.callbackQuery?.data) {
        (ctx.state as State).answerTo = 'kbAction';
        return ctx.callbackQuery.data.split('-')[1];
      }
      return undefined;
    });

    kb.route('item', async (ctx) => {
      const walletId = ctx.callbackQuery?.data?.split('-').slice(2).join('-') as string;
      (ctx.state as State).opWalletId = walletId;
      await this.showItem(walletId, ctx);
    });

    kb.route('backtoitem', async (ctx) => {
      await this.showItem(this.getStId(ctx), ctx);
    });

    kb.route('activ', async (ctx) => {
      const walletId = this.getStId(ctx);
      ctx.wallets.makeActive(walletId);
      await this.showItem(walletId, ctx);
    });

    kb.route('delete', async (ctx) => {
      await view(
        'ManageWallets.askDeleteConfirm',
        ctx,
        ctx.wallets.getPublicData(this.getStId(ctx)),
      );
    });

    kb.route('deleteconf', async (ctx) => {
      const walletId = this.getStId(ctx);
      if (!walletId) throw new Error('No wallet id');
      await ctx.wallets.remove(walletId);
      if (!ctx.wallets.count) {
        await this.reroute(ctx, 'AddWallet');
      } else await this.showList(ctx);
    });

    kb.route('rename', async (ctx) => {
      expect('name', ctx);
      await view(
        'ManageWallets.rename',
        ctx,
        ctx.wallets.getPublicData(this.getStId(ctx)),
      );
    });

    kb.route('backup', async (ctx) => {
      const walletId = this.getStId(ctx);
      await view('ManageWallets.backup', ctx, {
        ...ctx.wallets.getPublicData(walletId),
        backup: await ctx.wallets.getBackupNonActive(walletId),
      });
    });

    kb.route('resetprior', async (ctx) => {
      const walletId = this.getStId(ctx);
      await ctx.wallets.sprior('clear', walletId);
      await this.showItem(walletId, ctx);
    });

    kb.route('list', async (ctx) => {
      delete (ctx.state as State).opWalletId;
      await this.showList(ctx);
    });

    kb.route('addwallet', async (ctx) => {
      await this.reroute(ctx, 'AddWallet');
    });

    const conv = new Router<CustomCtx>((ctx) => (ctx.state as State).answerTo);

    conv.route('name', async (ctx) => {
      if (!ctx.message?.text) throw new InputError('noAction');
      if (ctx.message.text.length > 15) throw new InputError('nameTooLong');
      const walletId = (ctx.state as State).opWalletId;
      if (!walletId) throw new Error('No wallet id');
      await ctx.wallets.rename(walletId, ctx.message.text);
      expect('kbAction', ctx);
      await view('ManageWallets.readyUi', ctx);
      await this.showItem(walletId, ctx, 'send');
    });

    this.controller.use(kb);
    this.controller.use(conv);
  }

  override async defaultHandler(ctx: CustomCtx) {
    if ((ctx.state as State).answerTo) throw new InputError('noAction');
    expect('kbAction', ctx);
    await view('ManageWallets.readyUi', ctx);
    await this.showList(ctx, 'send');
    this.useAsNext(ctx);
  }

  override async exitHandler(ctx: CustomCtx) {
    await view('ManageWallets.exitUi', ctx);
  }

  private async showItem(walletId : string, ctx: CustomCtx, action?: 'send' | 'edit') {
    await view('ManageWallets.item', ctx, {
      action: action || 'edit',
      ...ctx.wallets.getPublicData(walletId),
      isActive: walletId === ctx.wallets.getActive().id,
    });
  }

  private async showList(ctx: CustomCtx, action?: 'send' | 'edit') {
    await view('ManageWallets.list', ctx, {
      action: action || 'edit',
      list: ctx.wallets.getAllPublicData(),
      active: ctx.wallets.getPublicData(ctx.wallets.getActive()),
    });
  }

  private getStId(ctx: CustomCtx) {
    const walletId = (ctx.state as State).opWalletId;
    if (!walletId) throw new Error('No wallet id');
    return walletId;
  }
}

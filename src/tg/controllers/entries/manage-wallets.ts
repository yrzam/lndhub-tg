import { Filter } from 'grammy';
import { Router } from '@grammyjs/router';
import type { CustomCtx } from '@tg/bot';
import InputError from '@tg/bot/utils/input-error';
import { cb as cbFixed, cbPrefixes } from '@tg/constants';
import view from '@tg/views';
import { tToAll } from '@utils/i18n-service';
import { Controller } from '../base';

const cb = { ...cbFixed.manage, ...cbPrefixes.manage };

type Ctx = CustomCtx & {
  state: {
    step?: 'name' | 'kbAction',
    opWalletId?: string,
    // used by view
    msgToEdit?: number
  }
};

export default class ManageWallets extends Controller {
  override use() {
    this.controller.hears(
      tToAll('basic.doneButton'),
      (ctx) => this.reroute(ctx, 'Home'),
    );

    const kb = new Router<Filter<Ctx, 'callback_query:data'>>((ctx) => {
      ctx.state.step = 'kbAction';
      return Object.values(cb).find((v) => ctx.callbackQuery.data.startsWith(v));
    });

    kb.route(cb.item, async (ctx) => {
      const walletId = ctx.callbackQuery.data.substring(cb.item.length);
      ctx.state.opWalletId = walletId;
      await this.showItem(walletId, ctx);
    });

    kb.route(cb.backToItem, (ctx) => this.showItem(this.getStId(ctx), ctx));

    kb.route(cb.active, async (ctx) => {
      const walletId = this.getStId(ctx);
      ctx.wallets.makeActive(walletId);
      await this.showItem(walletId, ctx);
    });

    kb.route(cb.delete, (ctx) => view(
      'ManageWallets.askDeleteConfirm',
      ctx,
      ctx.wallets.getPublicData(this.getStId(ctx)),
    ));

    kb.route(cb.deleteConf, async (ctx) => {
      const walletId = this.getStId(ctx);
      await ctx.wallets.remove(walletId);
      if (!ctx.wallets.count) {
        await this.reroute(ctx, 'AddWallet');
      } else await this.showList(ctx);
    });

    kb.route(cb.rename, async (ctx) => {
      await view(
        'ManageWallets.rename',
        ctx,
        ctx.wallets.getPublicData(this.getStId(ctx)),
      );
      ctx.state.step = 'name';
    });

    kb.route(cb.backup, async (ctx) => {
      const walletId = this.getStId(ctx);
      await view('ManageWallets.backup', ctx, {
        ...ctx.wallets.getPublicData(walletId),
        backup: await ctx.wallets.getBackupNonActive(walletId),
      });
    });

    kb.route(cb.resetPrior, async (ctx) => {
      const walletId = this.getStId(ctx);
      await ctx.wallets.sprior('clear', walletId);
      await this.showItem(walletId, ctx);
    });

    kb.route(cb.list, async (ctx) => {
      delete ctx.state.opWalletId;
      await this.showList(ctx);
    });

    kb.route(cb.addWallet, (ctx) => this.reroute(ctx, 'AddWallet'));

    const conv = new Router<Filter<Ctx, 'message:text'>>((ctx) => ctx.state.step);

    conv.route('name', async (ctx) => {
      if (ctx.message.text.length > 15) throw new InputError('nameTooLong');
      const walletId = ctx.state.opWalletId;
      if (!walletId) throw new Error('No wallet id');
      await ctx.wallets.rename(walletId, ctx.message.text);
      await view('ManageWallets.readyUi', ctx);
      await this.showItem(walletId, ctx, 'send');
      ctx.state.step = 'kbAction';
    });

    this.controller.on('callback_query:data', kb);
    this.controller.on('message:text', conv);
  }

  override async defaultHandler(ctx: Ctx) {
    if (ctx.state.step) throw new InputError('noAction');
    await view('ManageWallets.readyUi', ctx);
    await this.showList(ctx, 'send');
    this.useAsNext(ctx);
    ctx.state.step = 'kbAction';
  }

  override async exitHandler(ctx: Ctx) {
    await view('ManageWallets.exitUi', ctx);
  }

  private async showItem(walletId : string, ctx: Ctx, action?: 'send' | 'edit') {
    await view('ManageWallets.item', ctx, {
      action: action || 'edit',
      ...ctx.wallets.getPublicData(walletId),
      isActive: walletId === ctx.wallets.getActive().id,
    });
  }

  private async showList(ctx: Ctx, action?: 'send' | 'edit') {
    await view('ManageWallets.list', ctx, {
      action: action || 'edit',
      list: ctx.wallets.getAllPublicData(),
      active: ctx.wallets.getPublicData(ctx.wallets.getActive()),
    });
  }

  private getStId(ctx: Ctx) {
    const walletId = ctx.state.opWalletId;
    if (!walletId) throw new Error('No wallet id');
    return walletId;
  }
}

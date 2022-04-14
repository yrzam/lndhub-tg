import type { CustomCtx } from '@tg/bot';
import qr from 'qrcode';
import escRegex from 'escape-regexp';
import { cb, cbPrefixes, qrParams } from '@tg/constants';
import view from '@tg/views';
import { UnpaidInvoice, Wallet } from '@model';
import { Controller } from '../base';

const walletOpPrefs = [cbPrefixes.home.collapse, cbPrefixes.home.expand,
  cbPrefixes.home.collapsedRefresh, cbPrefixes.home.expandedRefresh];

export default class Home extends Controller {
  override use() {
    this.controller.callbackQuery(
      new RegExp(`${walletOpPrefs.map((el) => `(${escRegex(el)})`).join('|')}.+`),
      async (ctx) => {
        const prefix = walletOpPrefs
          .find((el) => ctx.callbackQuery.data.startsWith(el)) as string;
        const isRefresh = ctx.callbackQuery.data.startsWith(cbPrefixes.home.collapsedRefresh)
          || ctx.callbackQuery.data.startsWith(cbPrefixes.home.expandedRefresh);
        if (isRefresh && Math.random() < 0.1) ctx.wallets.sprior(1);
        const wallet = ctx.wallets.getActive({ useCache: !isRefresh });
        if (wallet.id !== ctx.callbackQuery.data.substring(prefix.length)) {
          await view('Home.notAnActiveWallet', ctx);
          return;
        }
        if (ctx.callbackQuery.data.startsWith(cbPrefixes.home.expand)
          || ctx.callbackQuery.data.startsWith(cbPrefixes.home.expandedRefresh)) {
          await this.showExpandedWallet(wallet, ctx);
        } else await this.showCollapsedWallet(wallet, ctx);
      },
    );

    this.controller.callbackQuery(
      cb.home.delDetailed,
      (ctx) => view('Home.delDetailed', ctx),
    );

    this.controller.on('message::bot_command', async (ctx, next) => {
      const commandText = ctx.message.text?.slice(1).split(' ')[0];
      const num = parseInt(commandText || '', 10) - 1;
      if (!commandText || !Number.isInteger(num)) await next();
      else {
        const entry = commandText.endsWith('i')
          ? (await ctx.wallets.getActive().unpaidInvoices)[num]
          : (await ctx.wallets.getActive().txs)[num];
        await view('Home.entryDetailed', ctx, {
          index: num + 1,
          entry,
          qr: (entry instanceof UnpaidInvoice && entry.isPayable)
            ? await qr.toBuffer(entry.payReq.str, qrParams)
            : undefined,
        });
      }
    });
  }

  override async defaultHandler(ctx: CustomCtx) {
    const wallet = ctx.wallets.getActive({ useCache: false });
    if (Math.random() < 0.1) ctx.wallets.sprior(1);
    await view('Home.sendReceiveUi', ctx, ctx.wallets.getPublicData(wallet));
    await this.showCollapsedWallet(wallet, ctx, 'send');
  }

  private async showExpandedWallet(
    wallet: Wallet,
    ctx: CustomCtx,
    action?: 'send' | 'edit',
  ) {
    if (!wallet.hasCached('all')) ctx.wallets.rl('active', 4);
    wallet.cacheBehaviorNext('flushOnMiss');
    await view('Home.showExpanded', ctx, {
      action: action || 'edit',
      txs: await wallet.txs,
      unpaidInvs: await wallet.unpaidInvoices,
      balance: await wallet.balance,
      lastUpdate: wallet.lastCacheUpdate || new Date(),
      ...ctx.wallets.getPublicData(wallet),
    });
    wallet.cacheBehaviorNext('normal');
  }

  private async showCollapsedWallet(
    wallet: Wallet,
    ctx: CustomCtx,
    action?: 'send' | 'edit',
  ) {
    if (!wallet.hasCached('balance')) ctx.wallets.rl('active', 1);
    wallet.cacheBehaviorNext('flushOnMiss');
    await view('Home.showCollapsed', ctx, {
      action: action || 'edit',
      balance: await wallet.balance,
      lastUpdate: wallet.lastCacheUpdate || new Date(),
      ...ctx.wallets.getPublicData(wallet),
    });
    wallet.cacheBehaviorNext('normal');
  }
}

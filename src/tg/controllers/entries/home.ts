import view from '@tg/views';
import type { CustomCtx } from '@tg/bot';
import qr from 'qrcode';
import { LnInvoice } from '@model/.';
import { Controller } from '../base';

export default class Home extends Controller {
  override use() {
    this.controller.callbackQuery(
      /^(expand|collapse)-txs-for-.+/,
      async (ctx) => {
        const op = ctx.callbackQuery.data.split('-')[0] as 'expand' | 'collapse';
        const reqWalletId = ctx.callbackQuery.data.split('-').slice(3).join('-');
        const wallet = ctx.wallets.getActive();
        if (wallet.id !== reqWalletId) return view('Home.notAnActiveWallet', ctx);
        wallet.cacheBehaviorNext('flushOnMiss');
        if (op === 'expand') {
          if (!wallet.hasCached('all')) ctx.wallets.rl('active', 4);
          await view('Home.expandTxs', ctx, {
            // Order is important because new balance must stay in cache
            txs: await wallet.txs,
            unpaidInvs: await wallet.unpaidInvoices,
            balance: await wallet.balance,
            lastUpdate: wallet.lastCacheUpdate || new Date(),
            ...ctx.wallets.getPublicData(wallet),
          });
        } else if (op === 'collapse') {
          await view('Home.collapseTxs', ctx, {
            balance: await wallet.balance,
            lastUpdate: wallet.lastCacheUpdate || new Date(),
            ...ctx.wallets.getPublicData(wallet),
          });
        }
        wallet.cacheBehaviorNext('normal');
        return undefined;
      },
    );

    this.controller.callbackQuery(
      /^(expanded|collapsed)-refresh-for-.+/,
      async (ctx) => {
        const viewType = ctx.callbackQuery.data.split('-')[0] as 'expanded' | 'collapsed';
        const reqWalletId = ctx.callbackQuery.data.split('-').slice(3).join('-');
        const wallet = ctx.wallets.getActive({ useCache: false });
        if (wallet.id !== reqWalletId) return view('Home.notAnActiveWallet', ctx);
        if (viewType === 'expanded') {
          ctx.wallets.rl('active', 4);
          await view('Home.refreshExpanded', ctx, {
            txs: await wallet.txs,
            unpaidInvs: await wallet.unpaidInvoices,
            balance: await wallet.balance,
            lastUpdate: wallet.lastCacheUpdate || new Date(),
            ...ctx.wallets.getPublicData(wallet),
          });
        } else if (viewType === 'collapsed') {
          ctx.wallets.rl('active', 1);
          await view('Home.refreshCollapsed', ctx, {
            balance: await wallet.balance,
            lastUpdate: wallet.lastCacheUpdate || new Date(),
            ...ctx.wallets.getPublicData(wallet),
          });
        }
        return undefined;
      },
    );

    this.controller.callbackQuery('home-del-detailed', async (ctx) => {
      await view('Home.delDetailed', ctx);
    });

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
          qr: (entry instanceof LnInvoice && entry.isPayable && entry.payReq)
            ? await qr.toBuffer(entry.payReq.str, {
              type: 'png',
              margin: 2,
              scale: 6,
              color: {
                dark: '#000',
                light: '#fff',
              },
            })
            : undefined,
        });
      }
    });
  }

  override async defaultHandler(ctx: CustomCtx) {
    const wallet = ctx.wallets.rl('active', 1).getActive({ useCache: false });
    await view('Home.sendReceiveUi', ctx, ctx.wallets.getPublicData(wallet));
    await view('Home.wallet', ctx, {
      balance: await wallet.balance,
      lastUpdate: wallet.lastCacheUpdate || new Date(),
      ...ctx.wallets.getPublicData(wallet),
    });
  }
}

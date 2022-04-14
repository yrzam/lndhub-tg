import winston from 'winston';
import { BotError, Filter } from 'grammy';
import { AmountParser } from '@utils/amount-parser';
import view from '@tg/views';
import { MappedUnpaidInvoice, MappedUnpInvError } from '@model';
import { cb as cbFixed, cbPrefixes } from '@tg/constants';
import { Router } from '@grammyjs/router';
import { CustomCtx } from '@tg/bot';
import { Controller } from '../base';

const cb = { ...cbFixed.simpleInlineInv, ...cbPrefixes.simpleInlineInv };

export default class InlineInvoice extends Controller {
  override use() {
    this.controller.on('inline_query', async (ctx) => {
      if (!ctx.wallets.exist) {
        await view('SimpleInlineInvoice.noWallets', ctx);
        return;
      }
      try {
        ctx.wallets.rl('all');
        const parsed = await AmountParser.parse(
          ctx.inlineQuery.query,
          ctx.session.pref,
          ctx.i18n.locale(),
        );
        await view('SimpleInlineInvoice.showPreview', ctx, {
          ...parsed,
          wallets: ctx.wallets.getAllPublicData(),
        });
        // eslint-disable-next-line no-empty
      } catch (err) { }
    });

    this.controller.on('chosen_inline_result', async (ctx) => {
      const walletId = ctx.wallets.getAllPublicData()
        .find((el) => el.id === ctx.chosenInlineResult.result_id)?.id;
      if (!walletId) throw new Error('No such wallet');

      const parsed = await AmountParser.parse(
        ctx.chosenInlineResult.query,
        ctx.session.pref,
        ctx.i18n.locale(),
      );
      const inv = await MappedUnpaidInvoice.createInvoice(
        await ctx.wallets.checkOwnership(ctx.wallets.getById(walletId)),
        parsed.amount,
        parsed.comment,
      );
      await view('SimpleInlineInvoice.showInvoiceCollaplsed', ctx, {
        invoice: await inv.invoice, publicId: inv.publicId, parsedOverrides: parsed,
      });

      // eslint-disable-next-line no-empty
      try { ctx.wallets.rl('all', 10); } catch (err) {}
    });

    const kb = new Router<Filter<CustomCtx, 'callback_query:data'>>(
      (ctx) => Object.values(cb).find((v) => ctx.callbackQuery.data.startsWith(v)),
    );

    kb.route(cb.cancel, (ctx) => view('SimpleInlineInvoice.showStatus', ctx, {
      status: 'cancelled',
    }));

    kb.route(cb.expand, async (ctx) => {
      const inv = new MappedUnpaidInvoice(ctx.callbackQuery.data
        .substring(cb.expand.length));
      await view('SimpleInlineInvoice.showInvoiceExpanded', ctx, {
        invoice: await inv.invoice, publicId: inv.publicId,
      });
    });

    kb.route(cb.collapse, async (ctx) => {
      const inv = new MappedUnpaidInvoice(ctx.callbackQuery.data
        .substring(cb.collapse.length));
      await view('SimpleInlineInvoice.showInvoiceCollaplsed', ctx, {
        invoice: await inv.invoice, publicId: inv.publicId,
      });
    });

    kb.route(cb.pay, async (ctx) => {
      const inv = new MappedUnpaidInvoice(ctx.callbackQuery.data
        .substring(cb.pay.length));
      if (!ctx.wallets.exist) { await this.noWallets(ctx, inv.publicId); return; }
      await view('SimpleInlineInvoice.askConfirm', ctx, {
        invoice: await inv.invoice,
        publicId: inv.publicId,
        wallet: ctx.wallets.getPublicData(ctx.wallets.getActive()),
      });
    });

    kb.route(cb.payconf, async (ctx) => {
      if (!ctx.callbackQuery.data
        .substring(cb.payconf.length).startsWith(String(ctx.from?.id))) {
        winston.debug('Wrong party'); return;
      }
      const inv = new MappedUnpaidInvoice(ctx.callbackQuery.data
        .substring(cb.payconf.length)
        .split('-').slice(1).join('-'));
      if (!ctx.wallets.exist) { await this.noWallets(ctx, inv.publicId); return; }
      await inv.pay(await ctx.wallets.checkOwnership(ctx.wallets.rl('active', 10).getActive()));
      await this.confirmFlow(inv, ctx);
    });

    kb.route(cb.senderExtPaid, async (ctx) => this.confirmFlow(new MappedUnpaidInvoice(
      ctx.callbackQuery.data.substring(cb.senderExtPaid.length),
    ), ctx));

    this.controller.on('callback_query:data', kb);
  }

  override async errorHandler(err: BotError<CustomCtx>) {
    winston.debug('SimpleInlineInv: Error %s', err.message);
    if (err.error instanceof MappedUnpInvError) {
      const errDt = err.error.data;
      await view('SimpleInlineInvoice.error', err.ctx, {
        ...err.error,
        allowRetry: errDt.type === 'paymentFailed',
      });
      if (errDt.type === 'paymentFailed') throw errDt.walletError;
    } else if (!err.ctx.inlineQuery) throw err;
  }

  private async confirmFlow(mInvo: MappedUnpaidInvoice, ctx: CustomCtx) {
    await view('SimpleInlineInvoice.showStatus', ctx, {
      status: 'confirmedBySender', invoice: await mInvo.invoice,
    });
    try {
      if (await mInvo.isPaid) {
        await view('SimpleInlineInvoice.showStatus', ctx, {
          status: 'confirmed', invoice: await mInvo.invoice,
        });
      }
    } catch (err) {
      winston.info('Failed to check status of invo %s', mInvo.publicId);
    }
  }

  private async noWallets(ctx: CustomCtx, publicId: string) {
    return view('SimpleInlineInvoice.noWalletsMsg', ctx, {
      retryPublicId: publicId,
    });
  }
}

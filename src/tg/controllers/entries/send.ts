import { Router } from '@grammyjs/router';
import { BotError, Filter } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import scanQrFromImage from '@utils/qr-scanner';
import view from '@tg/views';
import { PaymentRequest, PayReqError, UnpaidInvoice } from '@model';
import InputError from '@tg/bot/utils/input-error';
import { cb } from '@tg/constants';
import winston from '@utils/logger-service';
import { plainToInstance } from 'class-transformer';
import { Controller } from '../base';

type Ctx = CustomCtx & {
  state: {
    step?:
    | 'payreq-or-photo' | 'ln-confirm'
    pendingInvoice?: UnpaidInvoice
  }
};

export default class Send extends Controller {
  override use() {
    const conv = new Router<
    Filter<Ctx, 'message'> | Filter<Ctx, 'callback_query:data'>>(
      (ctx) => ctx.state.step,
    );

    conv.route('payreq-or-photo', async (ctx) => {
      let payReq: PaymentRequest;
      try {
        if (ctx.message?.photo) {
          await view('Send.pending', ctx);
          const str = await scanQrFromImage((await ctx.getFile()).getUrl());
          winston.debug('Send: scanned qr code: %s', str);
          payReq = new PaymentRequest(str, 'ln');
        } else if (ctx.message?.text) {
          await view('Send.pending', ctx);
          payReq = new PaymentRequest(ctx.message.text, 'ln');
        } else throw new InputError('noAction');
      } catch (err) {
        if (err instanceof PayReqError) {
          throw new InputError('Invalid invoice', 'badAddress', { wrongAddr: err.req });
        }
        throw err;
      }
      const wallet = ctx.wallets.rl('active', 1).getActive();
      const invoice = await wallet.getInvoiceInfo(payReq);
      if (!invoice.isPayable) {
        await view('Send.lnExpired', ctx, invoice);
        await this.reroute(ctx, 'Send');
      } else {
        ctx.state.pendingInvoice = invoice;
        await view('Send.askLnConfirm', ctx, {
          wallet: ctx.wallets.getPublicData(wallet),
          invoice,
        });
        ctx.state.step = 'ln-confirm';
      }
    });

    conv.route('ln-confirm', async (ctx, next) => {
      if (ctx.callbackQuery?.data === cb.send.lnDecline) {
        await view('Send.editToStatus', ctx, 'declined');
        await this.reroute(ctx, 'Send');
      } else if (ctx.callbackQuery?.data === cb.send.lnConfirm) {
        await view('Send.editToStatus', ctx, 'confirmed');
        const invoice = plainToInstance(UnpaidInvoice, ctx.state.pendingInvoice);
        await view('Send.pending', ctx);
        await ctx.wallets.rl('active', 10)
          .checkOwnership(ctx.wallets.getActive())
          .then((w) => w.payInvoice(invoice.payReq));
        await view('Send.paid', ctx, invoice);
        await this.reroute(ctx, 'Home');
      } else await next();
    });

    this.controller.on(['message', 'callback_query:data'], conv);
  }

  override async defaultHandler(ctx: Ctx) {
    if (ctx.state.step) throw new InputError('noAction');
    await view('Send.prompt', ctx);
    this.useAsNext(ctx);
    ctx.state.step = 'payreq-or-photo';
  }

  override async errorHandler(err: BotError<Ctx>) {
    if (!(err.error instanceof InputError)) await this.reroute(err.ctx, 'Home');
    throw err;
  }
}

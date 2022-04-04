import { Router } from '@grammyjs/router';
import { BotError } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import scanQrFromImage from '@utils/qr-scanner';
import view from '@tg/views';
import { PaymentRequest, PayReqError } from '@model/.';
import InputError from '@tg/bot/utils/input-error';
import { Controller } from '../base';

type State = {
  answerTo:
  | 'payreq-or-photo' | 'ln-confirm'
  pendingPayReq: string
  pendingAmtSat: number
};

function expect(step: State['answerTo'], ctx: CustomCtx) {
  (ctx.state as State).answerTo = step;
}

export default class Send extends Controller {
  override use() {
    const conv = new Router<CustomCtx>((ctx) => (ctx.state as State).answerTo);

    conv.route('payreq-or-photo', async (ctx) => {
      let payReq: PaymentRequest;
      try {
        await view('Send.pending', ctx);
        if (ctx.message?.photo) {
          try {
            const str = await scanQrFromImage((await ctx.getFile()).getUrl());
            payReq = new PaymentRequest(str, 'ln');
          } catch (err) {
            if (err instanceof PayReqError) throw err;
            else throw new InputError('qrScanFailed');
          }
        } else if (ctx.message?.text) payReq = new PaymentRequest(ctx.message.text, 'ln');
        else throw new InputError('noAction');

        const wallet = ctx.wallets.rl('active', 1).getActive();
        const invoice = await wallet.getInvoiceInfo(payReq);
        if (!invoice.isPayable) {
          await view('Send.lnExpired', ctx, invoice);
          await this.reroute(ctx, 'Send');
        } else {
          (ctx.state as State).pendingPayReq = payReq.str;
          expect('ln-confirm', ctx);
          (ctx.state as State).pendingAmtSat = invoice.amount.get();
          await view('Send.askLnConfirm', ctx, {
            wallet: ctx.wallets.getPublicData(wallet),
            invoice,
          });
        }
      } catch (err) {
        if (err instanceof PayReqError) throw new InputError('Invalid btc addr', 'badAddress', { wrongAddr: err.req });
        throw err;
      }
    });

    conv.route('ln-confirm', async (ctx) => {
      if (ctx.callbackQuery?.data === 'send-ln-cancel') {
        await view('Send.editToStatus', ctx, 'declined');
        await this.reroute(ctx, 'Send');
      } else if (ctx.callbackQuery?.data === 'send-ln-confirm') {
        await view('Send.editToStatus', ctx, 'confirmed');
        await view('Send.pending', ctx);
        await ctx.wallets.rl('active', 10)
          .getActive()
          .payInvoice(new PaymentRequest((ctx.state as State).pendingPayReq, 'ln'));
        await view('Send.paid', ctx, { amountSat: (ctx.state as State).pendingAmtSat });
        await this.reroute(ctx, 'Home');
      } else throw new InputError('noAction');
    });

    this.controller.use(conv);
  }

  override async defaultHandler(ctx: CustomCtx) {
    expect('payreq-or-photo', ctx);
    await view('Send.prompt', ctx);
    this.useAsNext(ctx);
  }

  override async errorHandler(err: BotError<CustomCtx>) {
    if (!(err.error instanceof InputError)) await this.reroute(err.ctx, 'Home');
    throw err;
  }
}

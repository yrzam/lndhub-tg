import qr from 'qrcode';
import { Router } from '@grammyjs/router';
import { BotError, Filter } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import view from '@tg/views';
import { AmountParser, ParsedAmount } from '@utils/amount-parser';
import InputError from '@tg/bot/utils/input-error';
import { cb, qrParams } from '@tg/constants';
import { plainToInstance } from 'class-transformer';
import { Amount } from '@model';
import { Controller } from '../base';

type Ctx = CustomCtx & {
  state: {
    step?:
    | 'btc-or-ln-or-lncustom'
    | 'ln-amount' | 'ln-confirm' | 'ln-description'
    | 'lncustom-description'
    | 'ready',
    pendingDescription?: string
    parsed?: ParsedAmount
  }
};

export default class Receive extends Controller {
  override use() {
    const conv = new Router<
    Filter<Ctx, 'message:text'> | Filter<Ctx, 'callback_query:data'>>(
      (ctx) => ctx.state.step,
    );

    conv.route('btc-or-ln-or-lncustom', async (ctx, next) => {
      if (ctx.util.tHeard('receive.buttons.btc')) {
        const addr = (await ctx.wallets.getActive().btcAddr).str;
        await view('Receive.btc', ctx, {
          addr,
          qr: await qr.toBuffer(addr, qrParams),
        });
        ctx.state.step = 'ready';
      } else if (ctx.util.tHeard('receive.buttons.ln')) {
        await view('Receive.askLnDescription', ctx);
        ctx.state.step = 'ln-description';
      } else if (ctx.util.tHeard('receive.buttons.lnCustom')) {
        await view('StaticMsg.sendUnavail', ctx);
      } else await next();
    });

    conv.route('ln-description', async (ctx) => {
      if (!ctx.message?.text) throw new InputError('noAction');
      ctx.state.pendingDescription = ctx.message.text;
      await view('Receive.askLnAmount', ctx);
      ctx.state.step = 'ln-amount';
    });

    conv.route('ln-amount', async (ctx) => {
      if (!ctx.message?.text) throw new InputError('noAction');
      try {
        const preParsed = await AmountParser.parse(
          ctx.message.text,
          ctx.session.pref,
          ctx.i18n.locale(),
        );
        preParsed.comment = ctx.state.pendingDescription;
        ctx.state.parsed = preParsed;
        await view('Receive.askLnConfirmAmount', ctx, {
          reqData: preParsed,
          wallet: ctx.wallets.getPublicData(ctx.wallets.getActive()),
        });
        ctx.state.step = 'ln-confirm';
      } catch (err) {
        throw new InputError('Failed to parse amount', 'parseAmountError');
      }
    });

    conv.route('ln-confirm', async (ctx, next) => {
      if (ctx.callbackQuery?.data === cb.receive.lnDecline) {
        await view('Receive.askLnAmount', ctx);
        await view('Receive.editToStatus', ctx, 'declined');
        ctx.state.step = 'ln-amount';
      } else if (ctx.callbackQuery?.data === cb.receive.lnConfirm) {
        await view('Receive.editToStatus', ctx, 'confirmed');
        const payReq = await ctx.wallets.rl('active', 10)
          .checkOwnership(ctx.wallets.getActive())
          .then((w) => w.createInvoice(
            plainToInstance(Amount, ctx.state.parsed?.amount),
            ctx.state.parsed?.comment,
          )).then((inv) => inv.payReq.str);
        await view('Receive.ln', ctx, {
          payReq,
          desc: ctx.state.parsed?.comment || '',
          qr: await qr.toBuffer(payReq, qrParams),
        });
        ctx.state.step = 'ready';
      } else await next();
    });

    conv.route('ready', async (ctx) => this.reroute(ctx, 'Home'));

    this.controller.on(['message:text', 'callback_query:data'], conv);
  }

  override async defaultHandler(ctx: Ctx) {
    if (ctx.state.step) throw new InputError('noAction');
    await view('Receive.askBtcOrLnOrLnCustom', ctx);
    this.useAsNext(ctx);
    ctx.state.step = 'btc-or-ln-or-lncustom';
  }

  override async errorHandler(err: BotError<Ctx>) {
    if (!(err.error instanceof InputError)) await this.reroute(err.ctx, 'Home');
    throw err;
  }
}

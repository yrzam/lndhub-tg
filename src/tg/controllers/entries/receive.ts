import qr from 'qrcode';
import { Router } from '@grammyjs/router';
import { BotError } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import view from '@tg/views';
import { tMatch } from '@utils/i18n-service';
import { AmountParser } from '@utils/amount-parser';
import InputError from '@tg/bot/utils/input-error';
import { Controller } from '../base';

 type State = {
   answerTo:
   | 'btc-or-ln-or-lncustom'
   | 'ln-amount' | 'ln-confirm' | 'ln-description'
   | 'lncustom-description'
   | 'ready',
   pendingDescription: string
   pendingReq: string
 };

function expect(step: State['answerTo'], ctx: CustomCtx) {
  (ctx.state as State).answerTo = step;
}

export default class Receive extends Controller {
  override use() {
    const conv = new Router<CustomCtx>((ctx) => (ctx.state as State).answerTo);

    conv.route('btc-or-ln-or-lncustom', async (ctx) => {
      if (tMatch(ctx.message?.text, 'receive.buttons.btc')) {
        const addr = (await ctx.wallets.getActive().btcAddr).str;
        expect('ready', ctx);
        await view('Receive.btc', ctx, {
          addr,
          qr: await qr.toBuffer(addr, {
            type: 'png',
            margin: 2,
            scale: 8,
            color: {
              dark: '#000',
              light: '#fff',
            },
          }),
        });
      } else if (tMatch(ctx.message?.text, 'receive.buttons.ln')) {
        expect('ln-description', ctx);
        await view('Receive.askLnDescription', ctx);
      } else if (tMatch(ctx.message?.text, 'receive.buttons.lnCustom')) {
        await view('StaticMsg.sendUnavail', ctx);
      } else throw new InputError('noAction');
    });

    conv.route('ln-description', async (ctx) => {
      if (ctx.message?.text) {
        (ctx.state as State).pendingDescription = ctx.message.text;
        expect('ln-amount', ctx);
        await view('Receive.askLnAmount', ctx);
      } else throw new InputError('noAction');
    });

    conv.route('ln-amount', async (ctx) => {
      const request = ctx.message?.text;
      if (!request) throw new InputError('noAction');
      (ctx.state as State).pendingReq = request;
      try {
        const preParsed = await AmountParser.parse(
          request,
          ctx.session.pref,
          ctx.i18n.locale(),
        );
        preParsed.comment = (ctx.state as State).pendingDescription;
        expect('ln-confirm', ctx);
        await view('Receive.askLnConfirmAmount', ctx, {
          reqData: preParsed,
          wallet: ctx.wallets.getPublicData(ctx.wallets.getActive()),
        });
      } catch (err) {
        throw new InputError('Failed to parse amount', 'parseAmountError');
      }
    });

    conv.route('ln-confirm', async (ctx) => {
      if (ctx.callbackQuery?.data === 'receive-ln-decline') {
        expect('ln-amount', ctx);
        await view('Receive.askLnAmount', ctx);
        await view('Receive.editToStatus', ctx, 'declined');
      } else if (ctx.callbackQuery?.data === 'receive-ln-confirm') {
        await view('Receive.editToStatus', ctx, 'confirmed');
        const parsed = await AmountParser.parse(
          (ctx.state as State).pendingReq,
          ctx.session.pref,
          ctx.i18n.locale(),
        );
        parsed.comment = (ctx.state as State).pendingDescription;
        const payReq = (await ctx.wallets.rl('active', 10).getActive()
          .createInvoice(parsed.amount, parsed.comment)).str;
        expect('ready', ctx);
        await view('Receive.ln', ctx, {
          payReq,
          desc: (ctx.state as State).pendingDescription,
          qr: await qr.toBuffer(payReq, {
            type: 'png',
            margin: 2,
            scale: 6,
            color: {
              dark: '#000',
              light: '#fff',
            },
          }),
        });
      } else throw new InputError('noAction');
    });

    conv.route('ready', async (ctx) => this.reroute(ctx, 'Home'));

    this.controller.use(conv);
  }

  override async defaultHandler(ctx: CustomCtx) {
    expect('btc-or-ln-or-lncustom', ctx);
    await view('Receive.askBtcOrLnOrLnCustom', ctx);
    this.useAsNext(ctx);
  }

  override async errorHandler(err: BotError<CustomCtx>) {
    if (!(err.error instanceof InputError)) await this.reroute(err.ctx, 'Home');
    throw err;
  }
}

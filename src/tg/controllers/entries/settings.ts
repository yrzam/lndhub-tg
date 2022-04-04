import { Router } from '@grammyjs/router';
import { currencyService } from '@model/.';
import { CustomCtx } from '@tg/bot';
import InputError from '@tg/bot/utils/input-error';
import view from '@tg/views';
import { tToFilt } from '@utils/i18n-service';
import { Controller } from '../base';

type State = {
  answerTo: 'bias' | 'kbAction',
};

function expect(step: State['answerTo'], ctx: CustomCtx) {
  (ctx.state as State).answerTo = step;
}

export default class Settings extends Controller {
  override use() {
    this.controller.hears(tToFilt('basic.doneButton'), async (ctx) => {
      await this.reroute(ctx, 'Home');
    });

    const kb = new Router<CustomCtx>((ctx: CustomCtx) => {
      if (ctx.callbackQuery?.data) {
        (ctx.state as State).answerTo = 'kbAction';
        return ctx.callbackQuery.data.split('-')[1];
      }
      return undefined;
    });

    kb.route('main', async (ctx) => {
      await view('Settings.main', ctx, 'edit');
    });

    kb.route('language', async (ctx) => {
      await view('Settings.language', ctx);
    });

    kb.route('setlang', async (ctx) => {
      const newLang = ctx.callbackQuery?.data?.split('-').slice(-1)[0];
      if (!newLang) throw new InputError('noSuchLanguage');
      ctx.i18n.locale(newLang);
      await view('Settings.main', ctx, 'edit');
    });

    kb.route('currency', async (ctx) => {
      const pageNum = parseInt(ctx.callbackQuery?.data?.split('-').slice(-1)[0] || '', 10);
      await view('Settings.currency', ctx, { page: pageNum || 0 });
    });

    kb.route('setcurr', async (ctx) => {
      const newCurr = ctx.callbackQuery?.data?.split('-').slice(-1)[0];
      if (!newCurr || !(await currencyService.currencies).find((el) => el === newCurr)) {
        throw new InputError('noSuchCurrency');
      }
      ctx.session.pref.currency = newCurr;
      await view('Settings.main', ctx, 'edit');
    });

    kb.route('bias', async (ctx) => {
      expect('bias', ctx);
      await view('Settings.changeBias', ctx);
    });

    const conv = new Router<CustomCtx>((ctx) => (ctx.state as State).answerTo);

    conv.route('bias', async (ctx) => {
      const num = parseFloat(ctx.message?.text || '');
      if (num > -100 && num < 10000) {
        ctx.session.pref.createInvoFiatMultiplier = (num + 100) / 100;
        expect('kbAction', ctx);
        await view('Settings.readyUi', ctx);
        await view('Settings.main', ctx, 'send');
      } else throw new InputError('invalidNumber');
    });

    this.controller.use(kb);
    this.controller.use(conv);
  }

  override async defaultHandler(ctx: CustomCtx) {
    if ((ctx.state as State).answerTo) throw new InputError('noAction');
    expect('kbAction', ctx);
    await view('Settings.readyUi', ctx);
    await view('Settings.main', ctx, 'send');
    this.useAsNext(ctx);
  }

  override async exitHandler(ctx: CustomCtx) {
    await view('Settings.exitUi', ctx);
  }
}

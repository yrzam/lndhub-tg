import { Filter } from 'grammy';
import { Router } from '@grammyjs/router';
import { currencyService } from '@model';
import type { CustomCtx } from '@tg/bot';
import InputError from '@tg/bot/utils/input-error';
import { cb as cbFixed, cbPrefixes } from '@tg/constants';
import view from '@tg/views';
import { tToAll } from '@utils/i18n-service';
import { Controller } from '../base';

const cb = { ...cbFixed.settings, ...cbPrefixes.settings };

type Ctx = CustomCtx & {
  state: {
    step?: 'bias' | 'kbAction',
    // used by view
    msgToEdit?: number
  }
};

export default class Settings extends Controller {
  override use() {
    this.controller.hears(
      tToAll('basic.doneButton'),
      (ctx) => this.reroute(ctx, 'Home'),
    );

    const kb = new Router<Filter<Ctx, 'callback_query:data'>>((ctx) => {
      ctx.state.step = 'kbAction';
      return Object.values(cb).find((v) => ctx.callbackQuery.data.startsWith(v));
    });

    kb.route(cb.main, (ctx) => view('Settings.main', ctx, 'edit'));

    kb.route(cb.lang, (ctx) => view('Settings.language', ctx));

    kb.route(cb.setLang, async (ctx) => {
      const newLang = ctx.callbackQuery.data.substring(cb.setLang.length);
      if (!newLang) throw new InputError('noSuchLanguage');
      ctx.i18n.locale(newLang);
      await view('Settings.main', ctx, 'edit');
    });

    kb.route(cb.currPage, async (ctx) => {
      const pageNum = parseInt(ctx.callbackQuery?.data
        ?.substring(cb.currPage.length), 10);
      await view('Settings.currency', ctx, { page: pageNum || 0 });
    });

    kb.route(cb.setCurr, async (ctx) => {
      const newCurr = ctx.callbackQuery?.data?.substring(cb.setCurr.length);
      if (!newCurr || !(await currencyService.currencies)
        .find((el) => el === newCurr)) {
        throw new InputError('noSuchCurrency');
      }
      ctx.session.pref.currency = newCurr;
      await view('Settings.main', ctx, 'edit');
    });

    kb.route(cb.bias, async (ctx) => {
      await view('Settings.changeBias', ctx);
      ctx.state.step = 'bias';
    });

    const conv = new Router<Filter<Ctx, 'message:text'>>((ctx) => ctx.state.step);

    conv.route('bias', async (ctx) => {
      const num = parseFloat(ctx.message.text);
      if (num > -100 && num < 10000) {
        ctx.session.pref.fiatMult = (num + 100) / 100;
        await view('Settings.readyUi', ctx);
        await view('Settings.main', ctx, 'send');
        ctx.state.step = 'kbAction';
      } else throw new InputError('invalidNumber');
    });

    this.controller.on('callback_query:data', kb);
    this.controller.on('message:text', conv);
  }

  override async defaultHandler(ctx: Ctx) {
    if (ctx.state.step) throw new InputError('noAction');
    await view('Settings.readyUi', ctx);
    await view('Settings.main', ctx, 'send');
    this.useAsNext(ctx);
    ctx.state.step = 'kbAction';
  }

  override async exitHandler(ctx: Ctx) {
    await view('Settings.exitUi', ctx);
  }
}

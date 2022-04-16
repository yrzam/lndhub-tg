import config from 'config';
import { Filter } from 'grammy';
import { Router } from '@grammyjs/router';
import validUrl from 'valid-url';
import view from '@tg/views';
import type { CustomCtx } from '@tg/bot';
import { Wallet } from '@model';
import InputError from '@tg/bot/utils/input-error';
import { Controller } from '../base';

type Ctx = CustomCtx & {
  state: {
    step?:
    | 'create-or-import'
    | 'create-default-or-custom' | 'create-custom-url'
    | 'import-url'
    | 'name'
    | 'keySaved'
    addWalletData?: {
      id: string,
      backup: string
    }
  }
};

export default class AddWallet extends Controller {
  override use() {
    const conv = new Router<Filter<Ctx, 'message:text'>>((ctx) => ctx.state.step);

    conv.route('create-or-import', async (ctx, next) => {
      if (ctx.util.tHeard('addWallet.buttons.create')) {
        await view('AddWallet.askCreateDefaultOrCustom', ctx);
        ctx.state.step = 'create-default-or-custom';
      } else if (ctx.util.tHeard('addWallet.buttons.import')) {
        await view('AddWallet.askImportUrl', ctx);
        ctx.state.step = 'import-url';
      } else await next();
    });

    conv.route('create-default-or-custom', async (ctx, next) => {
      if (ctx.util.tHeard('addWallet.buttons.defaultHost')) {
        ctx.wallets.rl('all', 20);
        await Promise.all([
          view('AddWallet.pending', ctx, { verbose: false }),
          Wallet.create(config.get('model.defaultHubUrl'))
            .then(async (res) => {
              ctx.state.addWalletData = { id: res.id, backup: await res.backup };
            }),
        ]);
        await view('AddWallet.chooseName', ctx);
        ctx.state.step = 'name';
      } else if (ctx.util.tHeard('addWallet.buttons.customHost')) {
        await view('AddWallet.askCreateCustomUrl', ctx);
        ctx.state.step = 'create-custom-url';
      } else await next();
    });

    conv.route('create-custom-url', async (ctx) => {
      if (!validUrl.isWebUri(ctx.message.text)) throw new InputError('invalidUrl');
      await Promise.all([
        view('AddWallet.pending', ctx, { verbose: true }),
        Wallet.create(ctx.message.text)
          .then(async (res) => {
            ctx.state.addWalletData = { id: res.id, backup: await res.backup };
          })]);
      await view('AddWallet.chooseName', ctx);
      ctx.state.step = 'name';
    });

    conv.route('import-url', async (ctx) => {
      // validate & parse url
      if (!ctx.message.text.startsWith('lndhub://')) throw new InputError('invalidUrl');
      const hubUrl = ctx.message.text.split('@')[1];
      const login = ctx.message.text.split('@')[0]?.substring('lndhub://'.length).split(':')[0];
      const password = ctx.message.text.split('@')[0]?.substring('lndhub://'.length).split(':')[1];
      if (!hubUrl || !validUrl.isWebUri(hubUrl) || !login || !password) {
        throw new InputError('invalidUrl');
      }
      /// ///////////////////
      await Promise.all([
        view('AddWallet.pending', ctx, { verbose: true }),
        Wallet.import(hubUrl, { login, password })
          .then((res) => { ctx.state.addWalletData = res; }),
      ]);
      await view('AddWallet.chooseName', ctx);
      ctx.state.step = 'name';
    });

    conv.route('name', async (ctx) => {
      if (ctx.message.text.length > 15) throw new InputError('nameTooLong');
      const crData = ctx.state.addWalletData;
      if (!crData) throw new Error('No attached wallet data');
      const wallet = new Wallet(crData.id);
      await wallet.edit({ name: ctx.message.text });
      await ctx.wallets.add(wallet);
      await view('AddWallet.saveKey', ctx, { backup: crData.backup });
      ctx.state.step = 'keySaved';
    });

    conv.route('keySaved', (ctx) => this.reroute(ctx, 'Home'));

    this.controller.on('message:text', conv);
  }

  override async defaultHandler(ctx: Ctx) {
    if (ctx.state.step) throw new InputError('noAction');
    if (ctx.wallets.count > this.conf.maxWallets) {
      throw new InputError('Too many wallets', 'tooManyWallets');
    }
    await view('AddWallet.askCreateOrImport', ctx, { allowCancel: !!ctx.wallets.exist });
    this.useAsNext(ctx);
    ctx.state.step = 'create-or-import';
  }
}

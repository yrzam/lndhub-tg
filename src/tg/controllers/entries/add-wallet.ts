import config from 'config';
import { Router } from '@grammyjs/router';
import validUrl from 'valid-url';
import view from '@tg/views';
import type { CustomCtx } from '@tg/bot';
import { tMatch } from '@utils/i18n-service';
import { Wallet } from '@model/.';
import InputError from '@tg/bot/utils/input-error';
import { Controller } from '../base';

type State = {
  answerTo:
  | 'create-or-import'
  | 'create-default-or-custom' | 'create-custom-url'
  | 'import-url'
  | 'name'
  | 'keySaved'
  addWalletData?: {
    id: string,
    backup: string
  }
};

function expect(step: State['answerTo'], ctx: CustomCtx) {
  (ctx.state as State).answerTo = step;
}

export default class AddWallet extends Controller {
  override use() {
    this.controller.on('inline_query', async (ctx) => {
      await view('AddWallet.redirectFromInline', ctx);
    });
    this.controller.use(async (ctx, next) => {
      if (ctx.chatTypeStr === 'normal_private') await next();
    });

    const conv = new Router<CustomCtx>((ctx) => (ctx.state as State).answerTo);

    conv.route('create-or-import', async (ctx) => {
      if (tMatch(ctx.message?.text, 'addWallet.buttons.create')) {
        await view('AddWallet.askCreateDefaultOrCustom', ctx);
        expect('create-default-or-custom', ctx);
      } else if (tMatch(ctx.message?.text, 'addWallet.buttons.import')) {
        await view('AddWallet.askImportUrl', ctx);
        expect('import-url', ctx);
      } else throw new InputError('noAction');
    });

    conv.route('create-default-or-custom', async (ctx) => {
      if (tMatch(ctx.message?.text, 'addWallet.buttons.defaultHost')) {
        await view('AddWallet.pending', ctx, { verbose: false });
        ctx.wallets.rl('all', 20);
        (ctx.state as State).addWalletData = await Wallet.create(config.get('model.defaultHubUrl'));
        expect('name', ctx);
        await view('AddWallet.chooseName', ctx);
      } else if (tMatch(ctx.message?.text, 'addWallet.buttons.customHost')) {
        await view('AddWallet.askCreateCustomUrl', ctx);
        expect('create-custom-url', ctx);
      } else throw new InputError('noAction');
    });

    conv.route('create-custom-url', async (ctx) => {
      if (!ctx.message?.text) throw new InputError('noAction');
      if (!validUrl.isWebUri(ctx.message.text)) throw new InputError('invalidUrl');
      await view('AddWallet.pending', ctx, { verbose: true });
      (ctx.state as State).addWalletData = await Wallet.create(ctx.message.text);
      expect('name', ctx);
      await view('AddWallet.chooseName', ctx);
    });

    conv.route('import-url', async (ctx) => {
      if (!ctx.message?.text) throw new InputError('noAction');
      // validate & parse url
      if (!ctx.message.text.startsWith('lndhub://')) throw new InputError('invalidUrl');
      const hubUrl = ctx.message.text.split('@')[1];
      const login = ctx.message.text.split('@')[0]?.substring('lndhub://'.length).split(':')[0];
      const password = ctx.message.text.split('@')[0]?.substring('lndhub://'.length).split(':')[1];
      if (!hubUrl || !login || !password) throw new InputError('invalidUrl');
      /// ///////////////////
      (ctx.state as State).addWalletData = await Wallet.import(hubUrl, { login, password });
      await view('AddWallet.pending', ctx, { verbose: true });
      expect('name', ctx);
      await view('AddWallet.chooseName', ctx);
    });

    conv.route('name', async (ctx) => {
      if (!ctx.from?.id) throw new Error('Invalid user id');
      if (!ctx.message?.text) throw new InputError('noAction');
      if (ctx.message.text.length > 15) throw new InputError('nameTooLong');
      const crData = (ctx.state as State).addWalletData;
      if (!crData) throw new Error('No attached wallet data');
      const wallet = new Wallet(crData.id);
      await wallet.edit({ name: ctx.message.text });
      await ctx.wallets.add(wallet);
      expect('keySaved', ctx);
      await view('AddWallet.saveKey', ctx, { backup: crData.backup });
    });

    conv.route('keySaved', async (ctx) => this.reroute(ctx, 'Home'));

    this.controller.use(conv);
  }

  override async defaultHandler(ctx: CustomCtx) {
    if (ctx.wallets.count > this.conf.maxWallets) {
      throw new InputError('Too many wallets', 'tooManyWallets');
    }
    await view('AddWallet.askCreateOrImport', ctx, { allowCancel: !!ctx.wallets.exist });
    expect('create-or-import', ctx);
    this.useAsNext(ctx);
  }
}

import {
  Keyboard, InlineKeyboard, InputFile, GrammyError,
} from 'grammy';
import type { CustomCtx } from '@tg/bot';
import { tOrKey } from '@utils/i18n-service';
import { Amount, LnInvoice, OnchainTx } from '@model/.';
import AmountPresenter from '@utils/amount-presenter';
import { readableBias, readableNum } from '../utils/format-number';

type MinimalWalletData = {
  id: string
  name: string
  hubUrl: string
  balance: Amount
  lastUpdate: Date
};

type ExpandedWalletData =
  MinimalWalletData & {
    txs: Array<OnchainTx | LnInvoice>,
    unpaidInvs: Array<LnInvoice>
  };

function delDetailedState(ctx: CustomCtx) {
  delete ctx.state['entryDetailedMsg'];
  delete ctx.state['entryDetailedIsImage'];
}

function getDesc(
  ctx: CustomCtx,
  tx: LnInvoice | OnchainTx,
  maxLen: number,
) : string {
  let str: string;
  if ('description' in tx && tx.description) str = tx.description;
  else if (tx.type === 'onchain') {
    str = ctx.i18n.t('home.onchainDescription', {
      confCount: 'confCount' in tx ? tx.confCount : '',
    });
  } else str = '';
  if (str.length > maxLen) str = `${str.slice(0, maxLen - 3)}...`;
  return str;
}

async function getCollaplsedWalletUi(ctx: CustomCtx, data: MinimalWalletData)
  : Promise<[string, { reply_markup: InlineKeyboard }]> {
  return [ctx.i18n.t('home.minimalWallet', {
    wallet: data.name,
    balance: readableNum(await AmountPresenter.convert(data.balance, ctx.session.pref)),
    currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
    updated: data.lastUpdate.toLocaleString(ctx.i18n.locale()),
  }), {
    reply_markup: new InlineKeyboard()
      .text(ctx.i18n.t('home.buttons.update'), `collapsed-refresh-for-${data.id}`)
      .text(ctx.i18n.t('home.buttons.expandTxs'), `expand-txs-for-${data.id}`),
  }];
}

async function getExpandedWalletUi(ctx: CustomCtx, data: ExpandedWalletData)
  : Promise<[string, { reply_markup: InlineKeyboard, disable_web_page_preview: boolean }]> {
  const biasPercent = readableBias(
    ctx.session.pref.createInvoFiatMultiplier,
    ctx.session.pref.currency !== 'SAT',
  );
  return [ctx.i18n.t('home.expandedWallet', {
    wallet: data.name,
    hubUrl: data.hubUrl,
    balance: readableNum(await AmountPresenter.convert(data.balance, ctx.session.pref)),
    currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
    amount: ctx.session.pref.currency === 'SAT' ? '' : readableNum(data.balance.get()),
    bias: biasPercent || '',
    updated: data.lastUpdate.toLocaleString(ctx.i18n.locale()),
    txs: (await Promise.all(data.txs.slice(0, 20).map(
      async (el, i) => `/${i < 9 ? `0${i + 1}` : i + 1} ${ctx.i18n.t(el.direction === 'send'
        ? 'home.outTx' : 'home.inTx', {
        num: readableNum(await AmountPresenter.convert(
          el.amount.add((el as LnInvoice).fees),
          ctx.session.pref,
        )),
        currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
        description: getDesc(ctx, el, 22),
      })}`,
    ))).join('\n'),
    pendingInvs: (await Promise.all(data.unpaidInvs.slice(0, 10).map(
      async (el, i) => `/${i < 9 ? `0${i + 1}` : i + 1}i ${ctx.i18n.t(el.isPayable
        ? 'home.pendingInvo' : 'home.expiredInvo', {
        num: readableNum(await AmountPresenter.convert(
          el.amount.add((el as LnInvoice).fees),
          ctx.session.pref,
        )),
        currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
        description: getDesc(ctx, el, 22),
      })}`,
    ))).join('\n'),
  }), {
    reply_markup: new InlineKeyboard()
      .text(ctx.i18n.t('home.buttons.update'), `expanded-refresh-for-${data.id}`)
      .text(ctx.i18n.t('home.buttons.collapseTxs'), `collapse-txs-for-${data.id}`),
    disable_web_page_preview: true,
  }];
}

const Home = {
  sendReceiveUi: async (ctx: CustomCtx, data: { name: string }) => {
    await ctx.util.tReply('home.sendReceiveUiMsg', {
      reply_markup: {
        keyboard: new Keyboard()
          .text(ctx.i18n.t('home.buttons.walletN', {
            wallet: ctx.wallets.count > 1 ? data.name : '',
          })).row()
          .text(ctx.i18n.t('home.buttons.receive'))
          .text(ctx.i18n.t('home.buttons.send'))
          .build(),
        resize_keyboard: true,
      },
    });
  },
  wallet: async (ctx: CustomCtx, data: MinimalWalletData) => {
    await ctx.reply(...await getCollaplsedWalletUi(ctx, data));
    delDetailedState(ctx);
  },
  expandTxs: async (ctx: CustomCtx, data: ExpandedWalletData) => {
    await ctx.util.updateText(...await getExpandedWalletUi(ctx, data));
    await ctx.answerCallbackQuery();
  },
  collapseTxs: async (ctx: CustomCtx, data: MinimalWalletData) => {
    await ctx.util.updateText(...await getCollaplsedWalletUi(ctx, data));
    await ctx.answerCallbackQuery();
  },
  refreshExpanded: async (ctx: CustomCtx, data: ExpandedWalletData) => {
    await ctx.util.updateText(...await getExpandedWalletUi(ctx, data));
    await ctx.answerCallbackQuery();
  },
  refreshCollapsed: async (ctx: CustomCtx, data: MinimalWalletData) => {
    await ctx.util.updateText(...await getCollaplsedWalletUi(ctx, data));
    await ctx.answerCallbackQuery();
  },
  entryDetailed: async (ctx: CustomCtx, data: {
    index: number,
    entry: LnInvoice | undefined | OnchainTx,
    qr: Buffer | undefined
  }) => {
    await ctx.util.delete();
    let str;
    if (!data.entry) str = ctx.i18n.t('errors.noTxEntry');
    else if (data.entry instanceof OnchainTx || data.entry.occured) {
      str = ctx.i18n.t('home.txDetailed', {
        prefix: ctx.i18n.t(data.entry.direction === 'receive'
          ? 'home.inTxPrefix' : 'home.outTxPrefix'),
        i: data.index,
        currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
        description: getDesc(ctx, data.entry, 1000),
        date: data.entry.time.toLocaleString(ctx.i18n.locale()),
        num: readableNum(await AmountPresenter.convert(
          data.entry.amount,
          ctx.session.pref,
        )),
        amount: ctx.session.pref.currency === 'SAT' ? '' : readableNum(data.entry.amount.get()),
        fee: (data.entry instanceof LnInvoice && data.entry.fees?.get())
          ? ctx.i18n.t('home.opt.feeDetailed', {
            num: readableNum(await AmountPresenter.convert(
              data.entry.fees,
              ctx.session.pref,
            )),
            currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
            amount: ctx.session.pref.currency === 'SAT' ? '' : readableNum(data.entry.fees.get()),
          })
          : '',
      });
    } else {
      str = ctx.i18n.t('home.unpaidInvoDetailed', {
        prefix: ctx.i18n.t(data.entry.isPayable
          ? 'home.payableInvoPrefix' : 'home.unpayableInvoPrefix'),
        i: data.index,
        currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
        description: getDesc(ctx, data.entry, 1000),
        created: data.entry.time.toLocaleString(ctx.i18n.locale()),
        expires: data.entry.expires?.toLocaleString(ctx.i18n.locale()) || '',
        num: readableNum(await AmountPresenter.convert(
          data.entry.amount,
          ctx.session.pref,
        )),
        amount: ctx.session.pref.currency === 'SAT' ? '' : readableNum(data.entry.amount.get()),
        payReq: data.entry.payReq?.str || '',
      });
    }
    const markup = {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('home.buttons.close'), 'home-del-detailed'),
    };
    const prevId = ctx.state['entryDetailedId'] as number | undefined;
    const prevIsImage = ctx.state['entryDetailedIsImage'] as boolean | undefined;
    try { // to edit
      if (!prevId || !ctx.chat) throw new Error('First');
      if (prevIsImage !== !!data.qr) {
        await ctx.api.deleteMessage(ctx.chat.id, prevId).catch((e) => e);
        throw new Error('Type mismatch');
      }
      await ctx.api.editMessageText(ctx.chat.id, prevId, str, markup);
    } catch (err) {
      if (err instanceof GrammyError
        && err.description.includes('message is not modified')) return;
      ctx.state['entryDetailedIsImage'] = !!data.qr;
      let msg;
      if (data.qr) {
        msg = await ctx.replyWithPhoto(new InputFile(data.qr), {
          caption: str,
          ...markup,
        });
      } else msg = await ctx.reply(str, markup);
      ctx.state['entryDetailedId'] = msg.message_id;
    }
  },
  notAnActiveWallet: async (ctx: CustomCtx) => {
    await ctx.util.delete();
  },
  delDetailed: async (ctx: CustomCtx) => {
    await ctx.util.delete();
    delDetailedState(ctx);
  },
};

export default Home;

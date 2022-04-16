import {
  Keyboard, InlineKeyboard, InputFile, GrammyError,
} from 'grammy';
import type { CustomCtx } from '@tg/bot';
import { esc, tOrKey } from '@utils/i18n-service';
import {
  Amount,
  LnInvoice, UnpaidInvoice, SettledInvoice,
  OnchainTx,
} from '@model';
import AmountPresenter from '@utils/amount-presenter';
import { cb, cbPrefixes } from '@tg/constants';
import InputError from '@tg/bot/utils/input-error';
import { readableBias, readableNum } from '../utils/format-number';
import unpaidToLoc from '../utils/unpaid-to-loc';

type Ctx = CustomCtx & {
  state: {
    entryDetailedId?: number,
    entryDetailedIsImage?: boolean
  }
};

type MinimalWalletData = {
  id: string
  name: string
  hubUrl: string
  balance: Amount
  lastUpdate: Date
};

type ExpandedWalletData =
  MinimalWalletData & {
    txs: Array<OnchainTx | SettledInvoice>,
    unpaidInvs: Array<UnpaidInvoice>
  };

function delDetailedState(ctx: Ctx) {
  delete ctx.state.entryDetailedId;
  delete ctx.state.entryDetailedIsImage;
}

function getDesc(
  ctx: Ctx,
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
  return esc(str);
}

const Home = {

  sendReceiveUi: async (ctx: Ctx, data: { name: string }) => {
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

  showCollapsed: async (ctx: Ctx, data: MinimalWalletData &
  { action: 'send' | 'edit' }) => {
    await ctx.util.updateTextOrReply(
      data.action,
      ctx.i18n.t('home.minimalWallet', {
        wallet: esc(data.name),
        balance: readableNum(await AmountPresenter.convert(data.balance, ctx.session.pref)),
        currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
        updated: data.lastUpdate.toLocaleString(ctx.i18n.locale()),
      }),
      {
        reply_markup: new InlineKeyboard()
          .text(ctx.i18n.t('home.buttons.update'), cbPrefixes.home.collapsedRefresh + data.id)
          .text(ctx.i18n.t('home.buttons.expandTxs'), cbPrefixes.home.expand + data.id),
      },
    );
    if (data.action === 'send') delDetailedState(ctx);
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  },

  showExpanded: async (ctx: Ctx, data: ExpandedWalletData &
  { action: 'send' | 'edit' }) => {
    await ctx.util.updateTextOrReply(
      data.action,
      ctx.i18n.t('home.expandedWallet', {
        wallet: esc(data.name),
        hubUrl: esc(data.hubUrl),
        balance: readableNum(await AmountPresenter.convert(data.balance, ctx.session.pref)),
        currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
        amount: ctx.session.pref.currency === 'SAT' ? '' : readableNum(data.balance.get()),
        bias: readableBias(ctx.session.pref.fiatMult, ctx.session.pref.currency !== 'SAT') || '',
        updated: data.lastUpdate.toLocaleString(ctx.i18n.locale()),
        txs: (await Promise.all(data.txs.slice(0, 20).map(
          async (el, i) => `/${i < 9 ? `0${i + 1}` : i + 1} ${ctx.i18n.t(el.direction === 'send'
            ? 'home.outTx' : 'home.inTx', {
            num: readableNum(await AmountPresenter.convert(
              el instanceof SettledInvoice ? el.totalWithFees : el.amount,
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
              el.amount,
              ctx.session.pref,
            )),
            currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
            description: getDesc(ctx, el, 22),
          })}`,
        ))).join('\n'),
      }),
      {
        reply_markup: new InlineKeyboard()
          .text(ctx.i18n.t('home.buttons.update'), cbPrefixes.home.expandedRefresh + data.id)
          .text(ctx.i18n.t('home.buttons.collapseTxs'), cbPrefixes.home.collapse + data.id),
        disable_web_page_preview: true,
      },
    );
    await ctx.answerCallbackQuery();
  },

  entryDetailed: async (ctx: Ctx, data: {
    index: number,
    entry: SettledInvoice | UnpaidInvoice | OnchainTx | undefined,
    qr: Buffer | undefined
  }) => {
    await ctx.util.delete();
    let str;
    if (!data.entry) str = ctx.i18n.t('errors.noTxEntry');
    else if (!(data.entry instanceof UnpaidInvoice)) {
      str = ctx.i18n.t('home.txDetailed', {
        prefix: ctx.i18n.t(data.entry.direction === 'receive'
          ? 'home.inTxPrefix' : 'home.outTxPrefix'),
        i: data.index,
        currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
        description: getDesc(ctx, data.entry, 1000),
        date: data.entry.time.toLocaleString(ctx.i18n.locale()),
        num: readableNum(await AmountPresenter.convert(data.entry.amount, ctx.session.pref)),
        amount: ctx.session.pref.currency === 'SAT' ? '' : readableNum(data.entry.amount.get()),
        fee: (data.entry instanceof SettledInvoice && data.entry.fees.get())
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
        ...await unpaidToLoc(data.entry, ctx),
        payReq: esc(data.entry.payReq.str),
      });
    }
    const markup = {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('home.buttons.close'), cb.home.delDetailed),
    };
    try { // to edit
      if (!ctx.state.entryDetailedId || !ctx.chat) throw new Error('First');
      if (ctx.state.entryDetailedIsImage !== !!data.qr) {
        await ctx.api.deleteMessage(ctx.chat.id, ctx.state.entryDetailedId).catch((e) => e);
        throw new Error('Type mismatch');
      }
      if (data.qr) {
        await ctx.api.editMessageCaption(ctx.chat.id, ctx.state.entryDetailedId, {
          caption: str, ...markup,
        });
      } else {
        await ctx.api.editMessageText(ctx.chat.id, ctx.state.entryDetailedId, str, markup);
      }
    } catch (err) {
      if (err instanceof GrammyError
        && err.description.includes('message is not modified')) return;
      ctx.state.entryDetailedIsImage = !!data.qr;
      let msg;
      if (data.qr) {
        msg = await ctx.replyWithPhoto(new InputFile(data.qr), {
          caption: str, ...markup,
        });
      } else msg = await ctx.reply(str, markup);
      ctx.state.entryDetailedId = msg.message_id;
    }
  },

  notAnActiveWallet: async (ctx: Ctx) => {
    await ctx.util.delete();
    throw new InputError('walletNotActive');
  },

  delDetailed: async (ctx: Ctx) => {
    await ctx.util.delete();
    delDetailedState(ctx);
  },

};

export default Home;

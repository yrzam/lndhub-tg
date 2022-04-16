import { InlineKeyboard } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import type { ParsedAmount } from '@utils/amount-parser';
import { esc, tOrKey } from '@utils/i18n-service';
import {
  currencyService, MappedUnpInvError, UnpaidInvoice,
} from '@model';
import AmountPresenter from '@utils/amount-presenter';
import { WalletPublicData } from '@tg/controllers/utils/wallets';
import { cb, cbPrefixes } from '@tg/constants';
import { readableNum, readableBias } from '../utils/format-number';
import unpaidToLoc from '../utils/unpaid-to-loc';

const SimpleInlineInvoice = {

  noWallets: async (ctx: CustomCtx) => {
    await ctx.answerInlineQuery([], {
      switch_pm_parameter: 'addwallet',
      switch_pm_text: ctx.i18n.t('simpleInline.noWallets'),
    });
  },

  showPreview: async (ctx: CustomCtx, data: ParsedAmount & {
    wallets: Array<WalletPublicData>
  }) => {
    const currency = tOrKey(ctx.i18n, `currencies.list.${data.currency.id}`);
    await ctx.answerInlineQuery(
      data.wallets.map((wallet) => ({
        type: 'article',
        title: ctx.i18n.t(
          'simpleInline.title',
          {
            num: readableNum(data.rawNum),
            currency,
            wallet: data.wallets.length > 1 ? wallet.name : '',
          },
        ),
        description: ctx.i18n.t(
          'simpleInline.description',
          {
            amount: readableNum(data.amount.get()),
            bias: readableBias(ctx.session.pref.fiatMult, data.biasApplied) || '',
            description: data.comment || '',
          },
        ),
        id: wallet.id,
        thumb_url: 'https://raw.githubusercontent.com/yrzam/lndhub-tg/main/'
          + 'res/images/ln-logo.png',

        input_message_content: {
          message_text: ctx.i18n.t(
            'simpleInline.message.pending',
            {
              num: readableNum(data.rawNum),
              currency,
            },
          ),
          parse_mode: 'HTML',
        },
        reply_markup: new InlineKeyboard().text(
          ctx.i18n.t('simpleInline.buttons.pleaseWait'),
          ' ',
        ),
      })),
      {
        is_personal: true,
        cache_time: 0,
      },
    );
  },

  showInvoiceCollaplsed: async (ctx: CustomCtx, data: {
    invoice: UnpaidInvoice,
    parsedOverrides?: ParsedAmount,
    publicId: string
  }) => {
    const num = data.parsedOverrides?.rawNum
      || readableNum(await AmountPresenter.convert(
        data.invoice.amount,
        ctx.session.pref,
      ));
    const currency = tOrKey(
      ctx.i18n,
      `currencies.list.${data.parsedOverrides?.currency.id
      || ctx.session.pref.currency}`,
    );

    await ctx.editMessageText(ctx.i18n.t('simpleInline.message.collapsed', {
      num,
      currency,
      amount: currency === 'SAT' ? '' : readableNum(data.invoice.amount.get()),
      description: esc(data.invoice.description || ''),
      bias: readableBias(ctx.session.pref.fiatMult, currency !== 'SAT') || '',
    }), {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('simpleInline.buttons.cancel'), cb.simpleInlineInv.cancel)
        .text(
          ctx.i18n.t('simpleInline.buttons.expand'),
          cbPrefixes.simpleInlineInv.expand + data.publicId,
        ).row()
        .text(
          ctx.i18n.t('simpleInline.buttons.pay', { num, currency }),
          cbPrefixes.simpleInlineInv.pay + data.publicId,
        ),
    });
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  },

  showInvoiceExpanded: async (ctx: CustomCtx, data: {
    invoice: UnpaidInvoice,
    publicId: string
  }) => {
    const num = readableNum(await AmountPresenter.convert(data.invoice.amount, ctx.session.pref));
    const currency = tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`);
    await ctx.editMessageText(ctx.i18n.t('simpleInline.message.expanded', {
      num,
      currency,
      amount: currency === 'SAT' ? '' : readableNum(data.invoice.amount.get()),
      description: esc(data.invoice.description || ''),
      bias: readableBias(ctx.session.pref.fiatMult, currency !== 'SAT') || '',
      created: data.invoice.time.toLocaleString(ctx.i18n.locale()),
      expires: data.invoice.expires.toLocaleString(ctx.i18n.locale()),
      payReq: esc(data.invoice.payReq.str),
    }), {
      reply_markup: new InlineKeyboard()
        .text(ctx.i18n.t('simpleInline.buttons.cancel'), cb.simpleInlineInv.cancel)
        .text(
          ctx.i18n.t('simpleInline.buttons.collapse'),
          cbPrefixes.simpleInlineInv.collapse + data.publicId,
        ).row()
        .url(
          ctx.i18n.t('simpleInline.buttons.changeWallet'),
          `https://t.me/${ctx.me.username}?start=wallets`,
        )
        .row()
        .text(
          ctx.i18n.t('simpleInline.buttons.alreadyPaid'),
          cbPrefixes.simpleInlineInv.senderExtPaid + data.publicId,
        )
        .row()
        .text(
          ctx.i18n.t('simpleInline.buttons.pay', { num, currency }),
          cbPrefixes.simpleInlineInv.pay + data.publicId,
        ),
    });
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  },

  askConfirm: async (ctx: CustomCtx, data: {
    invoice: UnpaidInvoice,
    wallet: WalletPublicData,
    publicId: string
  }) => {
    await ctx.editMessageText(ctx.i18n.t('simpleInline.qConfirm', {
      name: esc(ctx.from?.first_name || ''),
      wallet: esc(data.wallet.name),
      ...await unpaidToLoc(data.invoice, ctx),
    }), {
      reply_markup: new InlineKeyboard()
        .text(
          ctx.i18n.t('simpleInline.buttons.no'),
          cbPrefixes.simpleInlineInv.collapse + data.publicId,
        )
        .text(
          ctx.i18n.t('simpleInline.buttons.yes'),
          `${cbPrefixes.simpleInlineInv.payconf}${ctx.from?.id || 0}-${data.publicId}`,
        ),
    });
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  },

  showStatus: async (ctx: CustomCtx, data: {
    status: 'cancelled' | 'confirmedBySender' | 'confirmed'
    invoice?: UnpaidInvoice
  }) => {
    await ctx.editMessageText(
      ctx.i18n.t(
        `simpleInline.message.${data.status}`,
        data.invoice ? {
          num: readableNum(data.invoice.amount.get(
            await currencyService.getById(ctx.session.pref.currency),
          )),
          currency: tOrKey(ctx.i18n, `currencies.list.${ctx.session.pref.currency}`),
        } : undefined,
      ),
      data.status === 'confirmedBySender' ? {
        reply_markup: new InlineKeyboard().url(ctx.i18n.t(
          'simpleInline.buttons.openWallet',
        ), `https://t.me/${ctx.me.username}?start=wallets`),
      } : undefined,
    );
    if (ctx.callbackQuery && data.status === 'confirmedBySender') await ctx.answerCallbackQuery();
  },

  noWalletsMsg: async (ctx: CustomCtx, data: { retryPublicId: string }) => {
    await ctx.editMessageText(ctx.i18n.t('errors.inlineInv.noWallets', {
      name: esc(ctx.from?.first_name || ''),
    }), {
      reply_markup: new InlineKeyboard().text(
        ctx.i18n.t('simpleInline.buttons.expand'),
        cbPrefixes.simpleInlineInv.expand + data.retryPublicId,
      ),
    });
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  },

  error: async (ctx: CustomCtx, err: MappedUnpInvError & {
    allowRetry: boolean,
  }) => {
    await ctx.editMessageText(
      ctx.i18n.t(
        `errors.inlineInv.${err.data.type === 'getInfoFailed' ? err.data.getInfoError : err.data.type}`,
        err.data.type !== 'getInfoFailed'
          ? {
            walletError: ctx.i18n.t(err.data.walletError.data.type === 'serverError'
              ? `errors.hub.${err.data.walletError.data.serverError.key}`
              : `errors.${err.data.walletError.data.type}`),
          } : undefined,
      ),
      err.allowRetry && 'publicId' in err.data && err.data.publicId ? {
        reply_markup: new InlineKeyboard().text(
          ctx.i18n.t('simpleInline.buttons.back'),
          cbPrefixes.simpleInlineInv.expand + err.data.publicId,
        ),
      } : undefined,
    );
  },

};

export default SimpleInlineInvoice;

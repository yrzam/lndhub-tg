import { InlineKeyboard } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import type { ParsedAmount } from '@utils/amount-parser';
import { esc, tOrKey } from '@utils/i18n-service';
import { readableNum, readableBias } from '../utils/format-number';

type WalletsPreviewData = Array<{
  previewId: string,
  name: string
}>;

type PreviewFixedData = ParsedAmount
& { wallets: WalletsPreviewData };

const InlineInvoice = {
  showPreviewFixed: async (ctx: CustomCtx, data: PreviewFixedData) => {
    const biasPercent = readableBias(
      ctx.session.pref.createInvoFiatMultiplier,
      data.biasApplied,
    );
    const currency = tOrKey(ctx.i18n, `currencies.list.${data.currency.id}`);
    await ctx.answerInlineQuery(
      data.wallets.map((wallet) => ({
        type: 'article',
        title: ctx.i18n.t(
          'inline.invoiceTitle',
          {
            num: readableNum(data.rawNum),
            currency,
            wallet: data.wallets.length > 1 ? wallet.name : '',
          },
        ),
        description: ctx.i18n.t(
          'inline.invoiceDescription',
          {
            amount: readableNum(data.amount.get()),
            bias: biasPercent || '',
            comment: data.comment || '',
          },
        ),
        id: wallet.previewId,
        thumb_url: 'https://raw.githubusercontent.com/yrzam/lndhub-tg/main/'
          + 'res/images/ln-logo.png',

        input_message_content: {
          message_text: ctx.i18n.t(
            'inline.invoiceMessage.content',
            {
              num: readableNum(data.rawNum),
              amount: data.currency.id === 'SAT' ? '' : readableNum(data.amount.get()),
              currency,
              bias: biasPercent || '',
              comment: esc(data.comment || ''),
            },
          ),
          parse_mode: 'HTML',
        },
        reply_markup: new InlineKeyboard().url(
          ctx.i18n.t('inline.invoiceMessage.button', {
            num: readableNum(data.rawNum),
            currency,
          }),
          'https://google.com',
        ),

      })),
      {
        is_personal: true,
        cache_time: 0,
      },
    );
  },
  showPreviewAny: async (ctx: CustomCtx, data: WalletsPreviewData) => {
    await ctx.answerInlineQuery(data.map((wallet) => ({
      type: 'article',
      title: ctx.i18n.t('inline.payReqTitle', {
        wallet: data.length > 1 ? wallet.name : '',
      }),
      description: ctx.i18n.t('inline.payReqDescription'),
      id: wallet.previewId,
      thumb_url: 'https://raw.githubusercontent.com/yrzam/lndhub-tg/main/'
      + 'res/images/multi-ln-logo.png',

      input_message_content: {
        message_text: ctx.i18n.t('inline.payReqMessage.content'),
        parse_mode: 'HTML',
      },
      reply_markup: new InlineKeyboard().url(
        ctx.i18n.t('inline.payReqMessage.button'),
        'https://google.com',
      ),
    })), {
      is_personal: true,
      cache_time: 0,
    });
  },
};

export default InlineInvoice;

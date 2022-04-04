import winston from 'winston';
import { BotError } from 'grammy';
import { AmountParser } from '@utils/amount-parser';
import view from '@tg/views';
import { Controller } from '../base';

export default class InlineInvoice extends Controller {
  override use() {
    this.controller.use(async (ctx) => {
      const request = ctx.inlineQuery?.query || '';
      if (!request.length && true) {
        await view(
          'InlineInvoice.showPreviewAny',
          ctx,
          ctx.wallets.getAllPublicData().map((w) => ({
            name: w.name,
            previewId: String(Math.random()),
          })),
        );
        return;
      }
      try {
        const parsed = await AmountParser.parse(
          request,
          ctx.session.pref,
          ctx.i18n.locale(),
        );
        await view('InlineInvoice.showPreviewFixed', ctx, {
          ...parsed,
          wallets: ctx.wallets.getAllPublicData().map((w) => ({
            name: w.name,
            previewId: String(Math.random()),
          })),
        });
      // eslint-disable-next-line no-empty
      } catch (err) {}
    });
  }

  override errorHandler(err: BotError) {
    winston.debug('Could not handle req %s: %s', err.ctx.inlineQuery?.query, err.message);
  }
}

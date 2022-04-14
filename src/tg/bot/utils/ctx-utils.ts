/* eslint-disable no-param-reassign */
import { TemplateData } from '@grammyjs/i18n/dist/source';
import { tToAll } from '@utils/i18n-service';
import { NextFunction } from 'grammy';
import type { CustomCtx } from './custom-ctx';

export class CtxUtil {
  private ctx;

  constructor(ctx: CustomCtx) {
    this.ctx = ctx;
  }

  reply(...args: Parameters<CustomCtx['reply']>) {
    return this.ctx.reply(...args);
  }

  tReply(...args: Parameters<CustomCtx['reply']>) {
    args[0] = this.ctx.i18n.t(args[0]);
    return this.reply(...args);
  }

  async updateText(...args: Parameters<CustomCtx['editMessageText']>) {
    try {
      await this.ctx.editMessageText(...args);
    } catch (err) {
      await this.ctx.reply(...args);
    }
  }

  tUpdateText(...args: Parameters<CustomCtx['editMessageText']>) {
    args[0] = this.ctx.i18n.t(args[0]);
    return this.updateText(...args);
  }

  updateTextOrReply(
    action: 'send' | 'edit',
    ...args: Parameters<CustomCtx['editMessageText']>
  ) {
    if (action === 'send') return this.reply(...args);
    return this.updateText(...args);
  }

  delete() {
    return this.ctx.deleteMessage().catch((e) => e);
  }

  tHeard(k: string, templateData: Readonly<TemplateData> = {}): boolean {
    if (!this.ctx.message?.text) return false;
    const translations = tToAll(k, templateData);
    return translations.includes(this.ctx.message.text);
  }

  static async middleware(ctx: CustomCtx, next: NextFunction) {
    ctx.util = new CtxUtil(ctx);
    await next();
  }
}
export type CtxUtilFlavor = {
  util: CtxUtil
};

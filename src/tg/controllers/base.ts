/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */
import winston from 'winston';
import { Composer, BotError } from 'grammy';
import type { CustomCtx } from '@tg/bot';
import type { ControllerName, GlobalCtrlConfig } from '.';

export abstract class Controller {
  protected controller: Composer<CustomCtx>;

  private safeCtrlWrapper: Composer<CustomCtx>;

  protected conf: GlobalCtrlConfig;

  constructor(conf : GlobalCtrlConfig) {
    this.conf = conf;
    this.safeCtrlWrapper = new Composer<CustomCtx>();
    this.controller = this.safeCtrlWrapper.errorBoundary((err) => this.errorHandler(err));
    this.controller.use(async (ctx, next) => {
      this.loadState(ctx);
      try {
        await next();
      } finally {
        this.saveState(ctx);
      }
    });
    this.use();
    this.controller.use(async (ctx: CustomCtx) => {
      await this.defaultHandler(ctx);
    });
  }

  use() { }

  errorHandler(err: BotError<CustomCtx>): Promise<void> | void {
    winston.debug(
      'Default errorHandler called for controller %s: rethrowing %s',
      this.constructor.name,
      err.message,
    );
    throw err;
  }

  protected defaultHandler(_ctx: CustomCtx) { }

  exitHandler(_ctx: CustomCtx) { }

  protected useAsNext(ctx: CustomCtx) {
    ctx.session._boundCtrls[ctx.chatTypeStr] = this.constructor.name as ControllerName;
  }

  protected useAsNormal(ctx: CustomCtx) {
    if (ctx.session._boundCtrls[ctx.chatTypeStr] === this.constructor.name) {
      delete ctx.session._boundCtrls[ctx.chatTypeStr];
    }
  }

  protected async done(ctx: CustomCtx) {
    try {
      await this.exitHandler(ctx);
    // eslint-disable-next-line no-empty
    } catch (err) {}
    this.useAsNormal(ctx);
    ctx.state = {};
  }

  protected async reroute(
    ctx: CustomCtx,
    controllerName: ControllerName,
    state?: Record<string, unknown>,
  ): Promise<void> {
    ctx.reroute.target = controllerName;
    ctx.reroute.state = state;
    await this.done(ctx);
    this.saveState(ctx);
  }

  get middleware(): Composer<CustomCtx> {
    return this.safeCtrlWrapper;
  }

  async onReroutedFn(ctx: CustomCtx, extendState: Record<string, unknown> = {}) {
    this.loadState(ctx);
    ctx.state = { ...ctx.state, ...extendState };
    try {
      await this.defaultHandler(ctx);
    } catch (err) {
      await this.errorHandler(err instanceof BotError
        ? err
        : new BotError<CustomCtx>(err, ctx));
    } finally {
      this.saveState(ctx);
    }
  }

  loadState(ctx: CustomCtx) {
    ctx.state = ctx.session._ctrlStates[ctx.chatTypeStr]
      ?.[this.constructor.name as ControllerName] || {};
  }

  private saveState(ctx: CustomCtx) {
    ctx.session._ctrlStates[ctx.chatTypeStr] = ctx.session._ctrlStates[ctx.chatTypeStr] || {};
    ctx.session._ctrlStates[ctx.chatTypeStr]![this.constructor.name as ControllerName] = ctx.state;
    if (!Object.keys(ctx.session._ctrlStates[ctx.chatTypeStr] || {}).length) {
      delete ctx.session._ctrlStates[ctx.chatTypeStr];
    } else if (
      !Object.keys(
        (ctx.session._ctrlStates[ctx.chatTypeStr] || {})![
          this.constructor.name as ControllerName] || {},
      ).length) {
      delete ctx.session._ctrlStates[ctx.chatTypeStr]?.[this.constructor.name as ControllerName];
    }
  }
}

export type CtrlStateFlavor = {
  state: Record<string, unknown>
};

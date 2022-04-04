import {
  BotError, Composer, FilterQuery, matchFilter,
} from 'grammy';
import type { CustomCtx } from '@tg/bot';
import { loadControllers, ControllerName } from '@tg/controllers';
import { commonErrHandler } from '@tg/controllers/utils/ctrl-route-helper';
import type { RouterConfig } from '.';

type MaybePromise<T> = T | Promise<T>;

export default abstract class DynamicRouterBase {
  private main!: Composer<CustomCtx>;

  private controllers!: ReturnType<typeof loadControllers>;

  constructor(
    controllers = loadControllers(),
    conf?: RouterConfig,
  ) {
    this.reload(controllers, conf);
  }

  // routing logic
  abstract loadRoutes(conf?: RouterConfig) : void;

  get middleware() : Composer<CustomCtx> {
    return this.main;
  }

  protected init() {
    this.main = new Composer();
    this.supportRerouting();
  }

  reload(
    controllers = loadControllers(),
    conf?: RouterConfig,
  ) {
    this.controllers = controllers;
    this.loadRoutes(conf);
  }

  protected routeStatic(controllerName: ControllerName) {
    const ctrl = this.controllers[controllerName];
    this.main.use(ctrl.middleware);
  }

  protected route(
    p: ((ctx: CustomCtx) => boolean) | FilterQuery | Array<FilterQuery>,
    controllerName: ControllerName,
  ) {
    const ctrl = this.controllers[controllerName];
    this.main
      .filter(
        typeof p === 'function' ? p : matchFilter(p),
        ctrl.middleware,
      );
  }

  protected routeDynString(p: (ctx: CustomCtx) => MaybePromise<ControllerName | undefined>) {
    this.main
      .lazy(async (ctx: CustomCtx) => {
        const str = await p(ctx);
        if (!str) return [];
        const ctrl = this.controllers[str];
        return ctrl.middleware;
      });
  }

  private supportRerouting() {
    this.main.use(async (ctx: CustomCtx, next) => {
      ctx.reroute = {};
      try {
        await next();
      } catch (err) {
        if (err instanceof BotError) await commonErrHandler(err);
      } finally {
        if (ctx.reroute.target) {
          const { target, state } = ctx.reroute;
          delete ctx.reroute.target;
          delete ctx.reroute.state;
          try {
            await this.controllers[target].onReroutedFn(ctx, state);
          } catch (err) {
            if (err instanceof BotError) await commonErrHandler(err);
          }
        }
      }
    });
  }
}

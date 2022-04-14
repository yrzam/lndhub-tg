import winston from 'winston';
import config from 'config';
import { Bot as TgBot, Composer, session } from 'grammy';
import { MongoDBAdapter } from '@satont/grammy-mongodb-storage';
import { apiThrottler } from '@grammyjs/transformer-throttler';
import { parseMode } from '@grammyjs/parse-mode';
import { hydrateFiles } from '@grammyjs/files';
import { i18n } from '@utils/i18n-service';
import { DynamicRouter } from '@tg/routes';
import { WalletContextBinding } from '@tg/controllers/utils/wallets';
import { commonErrHandler } from '@tg/controllers/utils/ctrl-route-helper';
import SessionDB from './session-storage/index';
import { parseChatType } from './utils/chat-type';
import { sessionDefaults } from './session-storage/schema';
import type { CustomCtx } from './utils/custom-ctx';
import { CtxUtil } from './utils/ctx-utils';

export class Bot {
  private readonly bot: TgBot<CustomCtx>;

  private readonly sessionDB: SessionDB;

  private dynamicRouter = new DynamicRouter();

  constructor(token: string, opt?: {
    apiRoot?: string
    sessionDbUrl?: string,
    sessionMutator?: string
  }) {
    winston.debug('Constructing Bot with parameters: %s', opt || 'none');
    this.bot = new TgBot(token, {
      client: {
        ...(opt?.apiRoot ? { apiRoot: opt.apiRoot } : {}),
      },
    });
    this.sessionDB = new SessionDB(
      opt?.sessionDbUrl || config.get('tg.bot.mongoUrl'),
      opt?.sessionMutator,
    );
    this.bot.api.config.use(apiThrottler({
      out: {
        reservoirRefreshInterval: 2000,
        reservoirRefreshAmount: 2,
        reservoir: 2,
      },
    }));
    this.bot.api.config.use(hydrateFiles(token));
    this.bot.api.config.use(parseMode('HTML'));
  }

  async start(): Promise<void> {
    winston.info('Initializing bot...');
    await this.sessionDB.start();
    this.bot.use(session({
      initial: () => (sessionDefaults),
      storage: new MongoDBAdapter({
        collection: this.sessionDB.getSessionStorage(),
      }),
      getSessionKey: (ctx) => (ctx.chat?.id.toString() || ctx.from?.id.toString()),
    }));
    this.bot.use(i18n.middleware());
    this.logicMiddleware();
    this.bot.catch(commonErrHandler);

    winston.debug('Middlewares attached, connecting to Telegram...');
    this.bot.start();
    winston.info('Bot started');
  }

  async stop(): Promise<void> {
    winston.info('Shutting down bot...');
    winston.debug('Stopping bot: disconnecting from Telegram');
    await this.bot.stop();
    await this.sessionDB.stop();
    winston.info('Bot stopped gracefully');
  }

  private logicMiddleware() {
    const logic = new Composer<CustomCtx>();
    logic.use(parseChatType);
    logic.use(WalletContextBinding.middleware);
    logic.use(CtxUtil.middleware);
    logic.use(this.dynamicRouter.middleware);
    this.bot.errorBoundary(commonErrHandler).use(logic);
  }
}

export { CustomCtx };

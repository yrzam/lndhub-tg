import config from 'config';
import logger from './utils/logger-service';
import { Bot } from './tg/bot';
import { Model } from './model';

logger.debug('Starting app...');

const bot = new Bot(config.get('tg.bot.token'));
Model.start()
  .then(() => logger.debug('Model ready'))
  .then(() => bot.start()
    .then(() => logger.debug('Bot started')));

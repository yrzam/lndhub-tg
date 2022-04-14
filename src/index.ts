import config from 'config';
import winston from './utils/logger-service';
import { Bot } from './tg/bot';
import { Model } from './model';

winston.info('Starting app...');

const bot = new Bot(config.get('tg.bot.token'));
Model.start()
  .then(() => bot.start());

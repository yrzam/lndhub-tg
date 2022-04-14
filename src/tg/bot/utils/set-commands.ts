import { Bot } from 'grammy';
import { i18n } from '@utils/i18n-service';
import winston from '@utils/logger-service';
import type { CustomCtx } from './custom-ctx';

export const commands = ['home', 'wallets', 'settings', 'cancel'];

export async function setCommands(bot: Bot<CustomCtx> | CustomCtx) {
  Object.keys(i18n.repository).forEach(async (lang) => {
    winston.info('Setting bot commands [%s] for locale %s', commands, lang);
    await bot.api.setMyCommands(commands.map((el) => ({
      command: el,
      description: i18n.t(lang, `commands.${el}`),
    })), {
      scope: {
        type: 'default',
      },
      language_code: lang,
    });
  });
  winston.info('Setting bot commands [%s] for other locales', commands);
  await bot.api.setMyCommands(commands.map((el) => ({
    command: el,
    description: i18n.t(i18n.config.defaultLanguage, `commands.${el}`),
  })), {
    scope: {
      type: 'default',
    },
  });
}

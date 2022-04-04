import type { FileFlavor } from '@grammyjs/files';
import type { I18nContextFlavor } from '@grammyjs/i18n/dist/source';
import type { ParseModeContext } from '@grammyjs/parse-mode';
import type { Context as BaseContext, SessionFlavor } from 'grammy';
import type { CtrlStateFlavor } from '@tg/controllers/base';
import type { ReroutingFlavor } from '@tg/routes';
import type { WalletContextFlavor } from '@tg/controllers/utils/wallets';
import type { ChatTypeCompFlavor } from './chat-type';
import type { SessionSchema } from '../session-storage/schema';
import type { CtxUtilFlavor } from './ctx-utils';

export type CustomCtx =
  FileFlavor<
  & BaseContext
  & I18nContextFlavor
  & SessionFlavor<SessionSchema>
  & ParseModeContext
  & ChatTypeCompFlavor
  & CtrlStateFlavor
  & ReroutingFlavor
  & WalletContextFlavor
  & CtxUtilFlavor>;

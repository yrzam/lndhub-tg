/**
 * Bot session stores user preferences, settings, current state and some
 * cached data of model. Session must be persistent, although loss of
 * session data is not as critical as loss of model data.
 * In case of data loss, user must be able to restore session data with
 * minimal efforts.
 */

import type { WalletCacheData, UserWalletEntryMeta } from '@model/.';
import type { RateLimiterData } from '@tg/controllers/utils/wallets';
import type { Preferences as FinPreferences } from '@utils/amount-parser';
import type { ControllerName } from '@tg/controllers';
import type { ChatTypeCompFlavor } from '../utils/chat-type';

// real db schema is managed by grammy
export interface SessionSchema {
  // Defines whether session is possibly out of sync with model
  // and must be updated
  syncWithModelRequired: boolean,
  pref: FinPreferences,
  _wallets: Array<UserWalletEntryMeta>,
  _activeWallet?: { id: string, cache: WalletCacheData, rl: RateLimiterData }
  _boundCtrls: Partial<Record<ChatTypeCompFlavor['chatTypeStr'], ControllerName>>,
  _ctrlStates: Partial<Record<ChatTypeCompFlavor['chatTypeStr'],
  Partial<Record<ControllerName, Record<string, unknown>>>>>,
  _globalWalletRl: RateLimiterData
}

export const sessionDefaults: SessionSchema = {
  syncWithModelRequired: true, // new user? Or wiped session
  pref: {
    currency: 'SAT',
    createInvoFiatMultiplier: 1,
  },
  _wallets: [],
  _boundCtrls: {},
  _ctrlStates: {},
  _globalWalletRl: { pts: 0, startTimestamp: 0 },
};

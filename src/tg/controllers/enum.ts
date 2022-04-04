import Help from './entries/help';
import Admin from './entries/admin';
import UnavailNotifier from './entries/unavailable';
import InlineInvoice from './entries/inline-invoice';
import AddWallet from './entries/add-wallet';
import ManageWallets from './entries/manage-wallets';
import Settings from './entries/settings';
import Home from './entries/home';
import Receive from './entries/receive';
import Send from './entries/send';

export const controllers = {
  Help,
  Admin,
  UnavailNotifier,
  InlineInvoice,
  AddWallet,
  ManageWallets,
  Settings,
  Home,
  Receive,
  Send,
};

export type GlobalCtrlConfig = {
  maxWallets: number
};

export const globalCtrlConfig: GlobalCtrlConfig = {
  maxWallets: 5,
};

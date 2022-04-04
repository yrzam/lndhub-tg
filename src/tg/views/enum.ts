import Common from './entries/common';
import StaticMsg from './entries/static-msg';
import AddWallet from './entries/add-wallet';
import ManageWallets from './entries/manage-wallets';
import Settings from './entries/settings';
import InlineInvoice from './entries/inline-invoice';
import Home from './entries/home';
import Receive from './entries/receive';
import Send from './entries/send';

const views = {
  Common,
  InlineInvoice,
  AddWallet,
  ManageWallets,
  Settings,
  StaticMsg,
  Home,
  Receive,
  Send,
};

export default views;

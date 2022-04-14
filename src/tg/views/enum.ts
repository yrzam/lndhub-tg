import Error from './entries/error';
import StaticMsg from './entries/static-msg';
import AddWallet from './entries/add-wallet';
import ManageWallets from './entries/manage-wallets';
import Settings from './entries/settings';
import SimpleInlineInvoice from './entries/simple-inline-invoice';
import Home from './entries/home';
import Receive from './entries/receive';
import Send from './entries/send';

const views = {
  Error,
  SimpleInlineInvoice,
  AddWallet,
  ManageWallets,
  Settings,
  StaticMsg,
  Home,
  Receive,
  Send,
};

export default views;

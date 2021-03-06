import type { ControllerName } from '@tg/controllers';
import DynamicRouterBase from './dyn-router-base';

import BoundCtrl from './entries/bound-ctrl';
import { Admin, ManageWallets, Settings } from './entries/commands';
import { Home, Receive, Send } from './entries/home';
import { SimpleInlineInvoice } from './entries/inline';
import { AddWallet } from './entries/other';
import { FirstUse } from './entries/start';

export type RouterConfig = {
  disableAll: boolean,
  disableAuth: boolean
};

const routerConfig : RouterConfig = {
  disableAll: false,
  disableAuth: false,
};

export class DynamicRouter extends DynamicRouterBase {
  loadRoutes(conf: RouterConfig = routerConfig) {
    this.init();
    this.routeDynString(BoundCtrl);

    this.route(SimpleInlineInvoice, 'SimpleInlineInvoice');
    this.route('inline_query', 'UnavailNotifier');

    this.route(FirstUse, 'Help');
    this.route(Admin, 'Admin');
    this.route(() => conf.disableAll, 'UnavailNotifier');

    this.route(AddWallet, 'AddWallet');
    this.route(ManageWallets, 'ManageWallets');
    this.route(Settings, 'Settings');
    this.route(Receive, 'Receive');
    this.route(Send, 'Send');
    this.route(Home, 'Home');
  }
}

export type ReroutingFlavor = {
  reroute: {
    target?: ControllerName,
    state?: Record<string, unknown> | undefined
  }
};

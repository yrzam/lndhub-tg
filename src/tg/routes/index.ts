import type { ControllerName } from '@tg/controllers';
import DynamicRouterBase from './dyn-router-base';

import BoundCtrl from './entries/bound-ctrl';
import { ManageWallets, Settings } from './entries/commands';
import { Receive, Send } from './entries/home';
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
    this.route(FirstUse, 'Help');
    //    this.route(Admin, 'Admin');
    this.route(() => conf.disableAll, 'UnavailNotifier');
    this.route(AddWallet, 'AddWallet');
    this.route(ManageWallets, 'ManageWallets');
    this.route(Settings, 'Settings');
    //    this.route('inline_query', 'InlineInvoice');
    this.route(Receive, 'Receive');
    this.route(Send, 'Send');
    this.routeStatic('Home');
  }
}

export type ReroutingFlavor = {
  reroute: {
    target?: ControllerName,
    state?: Record<string, unknown> | undefined
  }
};

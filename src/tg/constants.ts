// eslint-disable-next-line import/prefer-default-export
export const cbPrefixes = {
  simpleInlineInv: {
    pay: 'sinlinvp-',
    payconf: 'sinlinepcf-',
    expand: 'sinlinvexp-',
    collapse: 'sinlinvcoll-',
    senderExtPaid: 'sinlinvextpaid-',
  },
  home: {
    collapsedRefresh: 'homecollref-',
    expandedRefresh: 'homeexpref-',
    collapse: 'homecoll-',
    expand: 'homeexp-',
  },
  manage: {
    item: 'mngitem-',
  },
  settings: {
    setLang: 'setssetlang-',
    setCurr: 'setssetcurr-',
    currPage: 'setscurrpg-',
  },
};

export const cb = {
  simpleInlineInv: {
    cancel: 'sinlinvcanc',
  },
  home: {
    delDetailed: 'homedeldet',
  },
  manage: {
    backToItem: 'mngbacktoitem',
    deleteConf: 'mngdelconf',
    addWallet: 'mngaddwallet',
    active: 'mngactiv',
    rename: 'mngrename',
    delete: 'mngdel',
    backup: 'mngbackup',
    resetPrior: 'mngresetpior',
    list: 'mnglist',
  },
  receive: {
    lnConfirm: 'rcvlnconf',
    lnDecline: 'rcvlndecl',
  },
  send: {
    lnConfirm: 'sndlnconf',
    lnDecline: 'sndlndecl',
  },
  settings: {
    main: 'setmain',
    lang: 'setslang',
    bias: 'setsbias',
  },
};

export const qrParams = {
  type: 'png' as const,
  margin: 2,
  scale: 6,
  color: {
    dark: '#000',
    light: '#fff',
  },
};

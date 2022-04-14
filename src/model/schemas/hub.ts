// Docs: https://yojoe.github.io/lightninghub-api/

import { z } from 'zod';

function parseNum(arg: string | number): number {
  return typeof arg === 'number' ? arg : parseInt(arg, 10);
}

export const createAcc = z.object({
  login: z.string(),
  password: z.string(),
});

export const auth = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
});

export const balance = z.object({
  BTC: z.object({
    AvailableBalance: z.number(),
  }),
});

export const getTxs = z.array(
  z.union([
    z.object({

      timestamp: z.union([z.number(), z.string()]),
      value: z.number(),
      fee: z.number(),
      type: z.string(),
      memo: z.string().optional(),

    }).transform((res) => ({
      ...res,
      timestamp: parseNum(res.timestamp),
    })).refine((res) => Object.values(res).some((el) => !Number.isNaN(el))),
    z.object({

      time: z.union([z.number(), z.string()]),
      amount: z.number(),
      type: z.string(),
      category: z.string(),

    }).transform((res) => ({
      ...res,
      time: parseNum(res.time),
    })).refine((res) => Object.values(res).some((el) => !Number.isNaN(el))),
  ]),
);

export const getPending = z.array(
  z.object({

    time: z.union([z.number(), z.string()]),
    amount: z.number(),
    category: z.string(),
    confirmations: z.number(),

  }).transform((res) => ({
    ...res,
    time: parseNum(res.time),
  })).refine((res) => Object.values(res).some((el) => !Number.isNaN(el))),
);

export const getInvoices = z.array(
  z.object({

    timestamp: z.union([z.number(), z.string()]),
    type: z.string(),
    ispaid: z.boolean().or(z.undefined()),
    amt: z.number(),
    payment_request: z.string(),
    description: z.string(),
    expire_time: z.union([z.number(), z.string()]),

  }).transform((res) => ({
    ...res,
    timestamp: parseNum(res.timestamp),
    expire_time: parseNum(res.expire_time),
  })).refine((res) => Object.values(res).some((el) => !Number.isNaN(el))),
);

export const getBtcAddr = z.array(
  z.object({
    address: z.string(),
  }),
).nonempty();

export const createInvoice = z.object({
  payment_request: z.string(),
});

// fixes strange API behavior - strings instead of ints
export const getInvoiceInfo = z.object({

  num_satoshis: z.union([z.number(), z.string()]),
  description: z.string(),
  expiry: z.union([z.number(), z.string()]),
  timestamp: z.union([z.number(), z.string()]),

}).transform((res) => ({
  ...res,
  num_satoshis: parseNum(res.num_satoshis),
  expiry: parseNum(res.expiry),
  timestamp: parseNum(res.timestamp),
})).refine((res) => Object.values(res).some((el) => !Number.isNaN(el)));

export const payInvoice = z.object({
  // API has no strict response schema for this
});

export const error = z.object({
  error: z.boolean(),
  code: z.number(),
  message: z.string(),
});

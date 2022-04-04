// Add field to context becasuse telegram
// does not keep chat.type consistent

import { NextFunction } from 'grammy';
import type { InlineQuery, Chat } from '@grammyjs/types';
import type { CustomCtx } from '..';

export type ChatTypeCompFlavor = {
  chatTypeStr: `inline_${InlineQuery['chat_type']}` |
  `normal_${Chat['type'] | 'undefined'}`
};

export async function parseChatType(ctx: CustomCtx, next: NextFunction) {
  ctx.chatTypeStr = ctx.inlineQuery
    ? `inline_${ctx.inlineQuery.chat_type}`
    : `normal_${ctx.chat?.type}`;
  await next();
}

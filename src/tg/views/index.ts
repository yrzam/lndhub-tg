import winston from 'winston';
import { flatten } from 'flat';
import { GrammyError } from 'grammy';
import type { CustomCtx } from '../bot';
import views from './enum';

// Flatten views type (by https://github.com/diegohaz)
type PathImpl<T, K extends keyof T> =
  K extends string
    ? T[K] extends Record<string, unknown>
      ? K | `${K}.${PathImpl<T[K], keyof T[K]>}`
      : K
    : never;
type Path<T> = PathImpl<T, keyof T>;
type PathValue<T, P extends Path<T>> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? Rest extends Path<T[K]>
        ? PathValue<T[K], Rest>
        : never
      : never
    : P extends keyof T
      ? T[P]
      : never;

// eslint-disable-next-line @typescript-eslint/ban-types
const flattenViewsObj: Record<string, Function> = flatten(views);

function inspectError(err: Error) {
  if (!(err instanceof GrammyError) || err.description.includes('can\'t parse entities')) {
    winston.error('Caught view error: %s', err.stack);
  }
}

export default async function send<
  T extends Path<typeof views>,
  V extends PathValue<typeof views, T>>(
  view: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: (V extends (...iArgs: any) => any ? Parameters<V> : [CustomCtx])
): Promise<void> {
  try {
    return await flattenViewsObj[view]?.(...args)
      || await flattenViewsObj[`${view}.default`]?.(...args);
  } catch (err) {
    if (err instanceof Error) {
      winston.debug('Unhandled view %s error: %s', view, err.message);
      inspectError(err);
    }
    return undefined;
  }
}

import {
  deepTypeCheck,
  defaultRateLimit,
  isNullish,
  qsParserArray,
  qsParserBoolean,
  qsParserDateTime,
  qsParserInteger,
  qsParserJson,
  qsParserString,
  type ParserConfig,
  type Require,
} from '@qstate/core';
import type {
  ReturnTypeResolveArgs,
  UseQueryStateOptions,
  UseQueryStateOptionsObject,
} from '../types';

/** Sentinel value to represent null/undefined in external store */
export const NO_PARAM = Symbol.for('qstate.no_param');

export const createEqualityChecker = <T>(equals?: (a: T, b: T) => boolean) => {
  return (a: T | null, b: T | null): boolean => {
    if (isNullish(a) || isNullish(b)) return false;
    return equals ? equals(a, b) : Object.is(a, b);
  };
};

export const shouldRemoveParam = <T>(
  value: T | null,
  defaultValue: T | null,
  removeIfDefault: boolean,
  checkEqual: (a: T | null, b: T | null) => boolean
): value is null => {
  return (
    isNullish(value) || (removeIfDefault && checkEqual(value, defaultValue))
  );
};

/**
 * resolver useQueryState args - recibes all hook args
 * and format its
 *
 * @param args - IArguments
 * @returns - {
 *     if first arg it going an object
 *    return an iterator {
 *      key,
 *      defaultValue,
 *      config
 *    }
 *
 *    other wise returns an {
 *      key,
 *      defaultValue,
 *      config
 *    }
 *
 *  }
 */
export function resolveArgs<T>(args: IArguments): ReturnTypeResolveArgs<T> {
  if (args.length === 1 && deepTypeCheck(args[0], 'object')) {
    return {
      isObject: true,
      *[Symbol.iterator]() {
        //https://blog.risingstack.com/async-iterators-in-node-js/
        const items = Object.entries<UseQueryStateOptionsObject<T>>(args[0]);

        for (const [key, item] of items) {
          if (deepTypeCheck(item, 'object')) {
            const { defaultValue, ...rest } = item;

            yield {
              key,
              defaultValue,
              config: {
                ...rest,
              },
            };
          } else {
            yield {
              key,
              defaultValue: item as T,
              config: {},
            };
          }
        }
      },
    };
  }
  if (
    args.length === 2 &&
    deepTypeCheck(args[0], 'string') &&
    deepTypeCheck(args[1], 'object')
  ) {
    const key = args[0];
    const { defaultValue, ...rest } = args[1] as UseQueryStateOptionsObject<T>;

    return {
      isObject: false,
      key,
      defaultValue: defaultValue,
      config: {
        ...rest,
      },
    };
  }

  if (
    args.length === 2 &&
    deepTypeCheck(args[0], 'string') &&
    !deepTypeCheck(args[1], 'object')
  ) {
    const key = args[0];
    const defaultValue = args[1];

    return {
      isObject: false,
      key,
      defaultValue: String(defaultValue) as T,
      config: {},
    };
  }
  const key = args[0];
  const defaultValue: T = args[1];
  const config = args[2] as UseQueryStateOptions<T>;

  return {
    isObject: false,
    key,
    defaultValue,
    config,
  };
}

export function defaultParsers<
  T,
  TReturn = Require<ParserConfig<T>, 'parse' | 'serialize'>,
>(defaultValue: T): TReturn {
  if (defaultValue instanceof Date) {
    return qsParserDateTime as TReturn;
  }

  const type = typeof defaultValue;

  if (type === 'string') return qsParserString as TReturn;
  if (type === 'number') return qsParserInteger as TReturn;
  if (type === 'boolean') return qsParserBoolean as TReturn;

  if (Array.isArray(defaultValue)) {
    const first = (defaultValue as any[])[0];
    const itemParser = defaultParsers(first ?? '') ?? qsParserString;
    return qsParserArray(itemParser) as TReturn;
  }

  if (type === 'object' && defaultValue !== null) {
    return qsParserJson() as TReturn;
  }

  return qsParserString as TReturn;
}

export function normalizeOptions<T>(
  options?: Partial<UseQueryStateOptions<T>>,
  _defaultValue?: T | null
) {
  const inferredParser = defaultParsers(_defaultValue);

  const defaults = {
    parse: inferredParser.parse,
    serialize: inferredParser.serialize,
    history: 'replace' as const,
    removeIfDefault: true,
    shallow: true,
    scroll: false,
    encode: false,
    checkEqual: inferredParser?.equals
      ? createEqualityChecker(inferredParser.equals)
      : createEqualityChecker<T>(),
    rateLimit: defaultRateLimit,
  };

  if (!options) return defaults;

  const parse = options.parse ?? defaults.parse;
  const serialize = options.serialize ?? defaults.serialize;
  const history = options.history ?? defaults.history;
  const removeIfDefault = options.removeIfDefault ?? defaults.removeIfDefault;
  const shallow = options.shallow ?? defaults.shallow;
  const scroll = options.scroll ?? defaults.scroll;
  const encode = options.encode ?? defaults.encode;

  const checkEqual = options.equals
    ? createEqualityChecker(options.equals)
    : defaults.checkEqual;

  const rateLimit =
    options.rateLimit && options.rateLimit.timeMs !== defaultRateLimit.timeMs
      ? { ...defaultRateLimit, ...options.rateLimit }
      : defaultRateLimit;

  return {
    parse,
    serialize,
    history,
    removeIfDefault,
    shallow,
    scroll,
    encode,
    checkEqual,
    rateLimit,
  };
}

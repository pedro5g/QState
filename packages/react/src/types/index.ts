import type { HistoryMode, HookOptions } from '@query-state/core';

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type StateUpdater<T> = (prevState: T) => T | null;

export interface SetQueryState<T> {
  (value: T | null, mode?: HistoryMode): void;
  (updater: StateUpdater<T>, mode?: HistoryMode): void;
}

export type ParserConfig<T> =
  | {
      parse: (value: string) => T | null;
      serialize: (value: T) => string;
      equals?: (a: T, b: T) => boolean;
    }
  | {
      parse?: undefined;
      serialize?: undefined;
      equals?: (a: T, b: T) => boolean;
    };

export type QueryStateConfig<T extends Record<string, any>> = {
  readonly [K in keyof T]: UseQueryStateOptionsObject<T[K]> | T[K];
};

export type QueryStateValues<Cfg extends Record<string, any>> = {
  [K in keyof Cfg]: ParsedFromParserObject<Cfg[K]>;
};

export type QueryStateSetters<Cfg extends Record<string, any>> = {
  [K in keyof Cfg]: SetQueryState<ParsedFromParserObject<Cfg[K]>>;
};

export type ParsedFromParserObject<P> = P extends { defaultValue: infer D }
  ? D
  : P extends ParserConfig<infer U>
    ? U | null
    : P;

export type ParsedFromParser<P> =
  P extends ParserConfig<infer U>
    ? U
    : P extends { defaultValue: infer D }
      ? D | null
      : never;

export type UseQueryStateOptions<T> = HookOptions & ParserConfig<T>;
export type UseQueryStateOptionsObject<T> = UseQueryStateOptions<T> & {
  defaultValue: T;
};

export type UseQueryStateReturn<
  Parsed,
  Default,
  Type = Default extends undefined ? Parsed | null : Parsed,
> = [Type, SetQueryState<Type>];

export type ReturnTypeResolveArgs<T> =
  | {
      isObject: true;
      [Symbol.iterator]: () => Generator<{
        key: string;
        defaultValue?: T;
        config: UseQueryStateOptions<T>;
      }>;
    }
  | {
      isObject: false;
      key: string;
      defaultValue?: T;
      config: UseQueryStateOptions<T>;
    };

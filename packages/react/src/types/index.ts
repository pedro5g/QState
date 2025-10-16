import type { HistoryMode, HookOptions, Require } from '@qstate/core';

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

export type UseQueryStateOptions<T> = HookOptions & ParserConfig<T>;
export type UseQueryStateOptionsObject<T> = UseQueryStateOptions<T> & {
  defaultValue?: T;
};

export type UseQueryStateReturn<
  Parsed,
  Default,
  Type = Default extends undefined ? Parsed | null : Parsed,
> = [Type, SetQueryState<Type>];

export type ParserIsPresent<TOptions, Parsed> =
  TOptions extends UseQueryStateOptions<any>
    ? TOptions['parse'] extends undefined
      ? string
      : Parsed
    : never;

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

import type { __QUERY_MANAGER__ } from '../utils';

export interface QSChangeEvent {
  keys: string[];
  method?: 'push' | 'replace';
  oldUrl?: string;
  newUrl?: string;
}

export type RateLimitConfig =
  | { mode: 'throttle'; timeMs: number }
  | { mode: 'debounce'; timeMs: number };

export type HistoryMode = 'replace' | 'push';

export type Options = {
  shallow?: boolean;
  historyAdapter?: HistoryAdapter;
  pathname?: string;
  scroll?: boolean;
};

export type FullOptions = Options & {
  rateLimit?: RateLimitConfig;
};

export interface HistoryAdapter {
  push(url: string, options?: { scroll?: boolean }): void;
  replace(url: string, options?: { scroll?: boolean }): void;
}

export interface Queue<TData> {
  enqueue(data: TData): void;
}

export interface QueryQueue extends Queue<QueueIntention> {
  process(): void;
}

export type QueueIntention = {
  key: string;
  value: string | null;
  method: HistoryMode;
  options: Options;
};

export interface HistoryPatch {
  patch(): void;
  unpatch(): void;
  subscribe(callback: () => void): void;
  safePushState<T = any>(
    data: T,
    unused: string,
    url?: string | URL | null
  ): void;
  safeReplaceState<T = any>(
    data: T,
    unused: string,
    url?: string | URL | null
  ): void;
}

export interface RateLimiter {
  execute(key: string, operation: () => void, config: RateLimitConfig): void;
  clearKey(key: string): void;
  cleanup(): void;
}

export interface PendingOperation {
  key: string;
  operation: () => void;
  timestamp: number;
  timeMs: number;
}

export interface QueryManager {
  init(): void;
  subscribe(key: string, callback: () => void): () => void;
  update(
    key: string,
    value: string | null,
    method: HistoryMode,
    options: Options,
    rateLimitConfig?: RateLimitConfig
  ): void;
  cleanup(): void;
}

export interface ParserConfig<T> {
  parse?: (value: string) => T | null;
  serialize?: (value: T) => string;
  equals?: (a: T, b: T) => boolean;
}

export type HookOptions = {
  history?: HistoryMode;
  removeIfDefault?: boolean;
  shallow?: boolean;
  scroll?: boolean;
  rateLimit?: RateLimitConfig;
  encode?: boolean;
};

export type CreateParserBuilder<T> = Required<ParserConfig<T>> &
  HookOptions & {
    defineOptions<This>(
      this: This,
      options: HookOptions
    ): Omit<This, 'defineOptions'>;
    setDefault<This>(
      this: This,
      defaultValue: NonNullable<T>
    ): Omit<This, 'withDefault'> & {
      readonly defaultValue: NonNullable<T>;
    };
  } & { readonly defaultValue?: T };

export type Require<T, K extends keyof T> = Pick<Required<T>, K> & Omit<T, K>;
export type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

declare global {
  interface Window {
    [__QUERY_MANAGER__]?: QueryManager;
  }
}

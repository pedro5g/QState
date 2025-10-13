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
  history?: HistoryAdapter;
  pathname?: string;
  scroll?: boolean;
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
  subscribe(key: string, callback: () => void): void;
  update(
    key: string,
    value: string | null,
    method: HistoryMode,
    options: Options,
    rateLimitConfig: RateLimitConfig
  ): void;
  cleanup(): void;
}

declare global {
  interface Window {
    [__QUERY_MANAGER__]?: QueryManager;
  }
}

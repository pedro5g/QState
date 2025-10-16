import type { FullOptions, HistoryMode } from '../types';
import { isClientSide } from '../utils';
import { queryManager } from './query-manager.factory';

export function readParam(key: string): string | null {
  if (!isClientSide()) return null;
  return new URLSearchParams(window.location.search).get(key);
}

export function writeParam(
  key: string,
  serialized: string | null,
  mode: HistoryMode = 'replace',
  options: FullOptions = {}
) {
  if (!isClientSide()) return;

  const { rateLimit, ...opts } = options;

  queryManager.update(key, serialized, mode, opts, rateLimit);
}

export function subscribeQS(callback: () => void, key: string) {
  if (!isClientSide()) return () => {};
  return queryManager.subscribe(key, callback);
}

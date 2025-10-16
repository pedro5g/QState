'use client';
import React from 'react';
import {
  isNullish,
  subscribeQS,
  writeParam,
  readParam,
  type HistoryAdapter,
  type HistoryMode,
  BrowserHistoryAdapter,
} from '@qstate/core';
import type {
  UseQueryStateOptions,
  UseQueryStateReturn,
  StateUpdater,
  SetQueryState,
  DeepPartial,
} from '../types';
import { NO_PARAM, normalizeOptions, shouldRemoveParam } from '../utils';

export function useCoreQueryState<T extends undefined>(
  key: string,
  defaultValue?: T
): UseQueryStateReturn<string, undefined>;
export function useCoreQueryState<T>(
  key: string,
  defaultValue: T,
  options?: UseQueryStateOptions<T>,
  historyAdapter?: HistoryAdapter
): UseQueryStateReturn<T, typeof defaultValue>;
export function useCoreQueryState<T>(
  key: string,
  defaultValue: T,
  options?: UseQueryStateOptions<T>,
  historyAdapter: HistoryAdapter = new BrowserHistoryAdapter()
): UseQueryStateReturn<T, typeof defaultValue> {
  //  if no default value was be passed, assumes with 'null'
  const _defaultValue = isNullish(defaultValue) ? null : defaultValue;

  const config = React.useMemo(
    () => normalizeOptions(options, _defaultValue),
    [options, _defaultValue]
  );

  const getSnap = React.useCallback(() => readParam(key) ?? NO_PARAM, [key]);
  const getServerSnap = React.useCallback(() => NO_PARAM, []);

  const subscriber = React.useCallback(
    (cb: () => void) => subscribeQS(cb, key),
    [key]
  );

  const raw = React.useSyncExternalStore(subscriber, getSnap, getServerSnap);

  // try get current value
  const currentValue = React.useMemo(() => {
    // if getting the sentry returns  the default value, the URL does't have the corresponding searchParam
    if (raw === NO_PARAM) return _defaultValue;
    try {
      const stringValue = decodeURIComponent(String(raw));
      return config.parse(stringValue) ?? _defaultValue;
    } catch (error) {
      console.warn(`Error parsing query param "${key}":`, error);
      return _defaultValue;
    }
  }, [raw, _defaultValue, config.parse, key]);

  /**
   * Updates the value of the query string.
   *
   * - `setValue(null)` → removes the parameter from the URL.
   * - `setValue(defaultValue)` → resets to the default value (and may remove it if `removeIfDefault` is enabled).
   * - `setValue(prev => prev + 1)` → functional update (same behavior as React's `useState`).
   * - `setValue({ partial: true })` → merges partial objects while preserving the current state.
   */
  const setValue = React.useCallback<SetQueryState<any>>(
    ((valueOrUpdater: T | StateUpdater<T>, mode?: HistoryMode) => {
      try {
        let nextState: T | null;

        if (typeof valueOrUpdater === 'function') {
          nextState = (valueOrUpdater as StateUpdater<T>)(currentValue as T);
        } else {
          nextState = valueOrUpdater as T;
        }
        const actualMode = mode ?? config.history;
        const shallow = config.shallow;
        const scroll = config.scroll;
        const rateLimit = config.rateLimit;

        const currentParam = readParam(key);

        if (
          nextState === null ||
          shouldRemoveParam(
            nextState,
            _defaultValue,
            config.removeIfDefault,
            config.checkEqual
          )
        ) {
          if (currentParam !== null) {
            writeParam(key, null, actualMode, {
              shallow,
              historyAdapter,
              scroll,
              rateLimit,
            });
          }
          return;
        }

        let serialized = config.serialize(nextState);

        if (serialized === currentParam) return;

        serialized = config.encode
          ? encodeURIComponent(serialized)
          : serialized;

        writeParam(key, serialized, actualMode, {
          shallow,
          historyAdapter,
          rateLimit,
          scroll,
        });
      } catch (error) {
        console.warn(`Error setting query param "${key}":`, error);
      }
    }) as SetQueryState<T>,
    [currentValue, key, config, defaultValue, historyAdapter]
  );

  return [currentValue as T, setValue];
}

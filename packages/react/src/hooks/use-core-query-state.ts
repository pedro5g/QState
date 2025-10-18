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
  historyAdapter?: HistoryAdapter
): UseQueryStateReturn<T, typeof defaultValue> {
  //  if no default value was be passed, assumes with 'null'
  const _defaultValue = isNullish(defaultValue) ? null : defaultValue;

  const configRef = React.useRef(normalizeOptions(options, _defaultValue));

  const adapter = React.useMemo(
    () => historyAdapter ?? new BrowserHistoryAdapter(),
    [historyAdapter]
  );

  React.useEffect(() => {
    configRef.current = normalizeOptions(options, _defaultValue);
  }, [options, _defaultValue]);

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
      return configRef.current.parse(stringValue) ?? _defaultValue;
    } catch (error) {
      console.warn(`Error parsing query param "${key}":`, error);
      return _defaultValue;
    }
  }, [raw, _defaultValue, key]);

  const currentValueRef = React.useRef(currentValue);

  React.useEffect(() => {
    currentValueRef.current = currentValue;
  }, [currentValue]);

  const setValue = React.useCallback<SetQueryState<any>>(
    ((valueOrUpdater: T | StateUpdater<T>, mode?: HistoryMode) => {
      try {
        let nextState: T | null;

        if (typeof valueOrUpdater === 'function') {
          nextState = (valueOrUpdater as StateUpdater<T>)(
            currentValueRef.current as T
          );
        } else {
          nextState = valueOrUpdater as T;
        }

        const config = configRef.current;
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
              historyAdapter: adapter,
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
          historyAdapter: adapter,
          rateLimit,
          scroll,
        });
      } catch (error) {
        console.warn(`Error setting query param "${key}":`, error);
      }
    }) as SetQueryState<T>,
    [key, _defaultValue, adapter]
  );

  return [currentValue as T, setValue];
}

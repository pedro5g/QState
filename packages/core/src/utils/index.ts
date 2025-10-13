import type { RateLimitConfig } from '../types';

export const isClientSide = () => typeof window !== 'undefined';

/**
 * check is nullish - nullish is (null | undefined)
 * @param value - any data
 * @returns - true if value is null | undefined other wise is false
 */
export const isNullish = (value: unknown) => {
  return value === undefined || value === null;
};

export type DeepCheckMap = {
  object: object;
  string: string;
  number: number;
  boolean: boolean;
  symbol: symbol;
  function: Function;
  array: unknown[];
  date: Date;
  null: null;
  undefined: undefined;
  map: Map<any, any>;
  set: Set<any>;
};

export const deepTypeCheck = <T extends keyof DeepCheckMap>(
  sut: unknown,
  type: T
): sut is DeepCheckMap[T] => {
  const camelCase = ([first, ...chars]: string) =>
    first?.toUpperCase() + chars.join('').toLowerCase();
  return Object.prototype.toString.call(sut) === `[object ${camelCase(type)}]`;
};

/**
 *
 * function to prevent execute some operation on first render, convert sync to async function
 *
 * this function try execute `callback` on next tick of JS EventLoop
 *
 * @reference https://github.com/47ng/nuqs/blob/next/packages/nuqs/src/lib/timeout.ts
 *
 * @param callback - function called after ticks based on `ms`
 * @param ms - 0 to exec on next trick
 * @param signal - AbortController instance to prevent memory leak - makes cleanup automatic
 */
export function timeout(
  callback: () => void,
  ms: number,
  signal: AbortSignal
): void {
  function onTick() {
    callback();
    signal.removeEventListener('abort', onAbort);
  }
  const id = setTimeout(onTick, ms);
  function onAbort() {
    clearTimeout(id);
    signal.removeEventListener('abort', onAbort);
  }
  signal.addEventListener('abort', onAbort);
}

export function getDefaultThrottle() {
  // 50ms between calls to the history API seems to satisfy Chrome and Firefox.
  if (!isClientSide()) return 50;
  // GestureChange is an exclusive event dispose on Safari
  // https://caniuse.com/?search=GestureChange
  // @ts-ignore
  const isSafari = Boolean(window.GestureEvent);
  if (!isSafari) return 50;
  try {
    const match = navigator.userAgent.match(/version\/([\d\.]+) safari/i);
    // Safari remains annoying with at most 100 calls in 30 seconds.
    // edit: Safari 17 now allows 100 calls per 10 seconds, a bit better.
    return parseFloat(match![1]!) >= 17 ? 120 : 320;
  } catch {
    return 320; // safe range
  }
}

/**
 * Create throttle config Object
 * @property {number} timeMs - time in milliseconds
 * @returns RateLimitConfig - returns object on mode 'throttle' with timeMs
 */
export function throttle(timeMs: number): RateLimitConfig {
  return {
    mode: 'throttle',
    timeMs,
  };
}
/**
 * Create debounce config Object
 * @property {number} timeMs - time in milliseconds
 * @returns RateLimitConfig - returns object on mode 'debounce' with timeMs
 */
export function debounce(timeMs: number): RateLimitConfig {
  return {
    mode: 'debounce',
    timeMs,
  };
}

export const defaultRateLimit: RateLimitConfig = throttle(getDefaultThrottle());

/**
 * Custom events used to intercept query state changes
 *
 * JS by default does not have a listener to this event.
 * Similar to how libs like react-router-dom and tanstack router create
 * custom events to support search params in their hooks.
 */
export const QS_EVENT = '__qschange__' as const;

export const __QUERY_MANAGER__: unique symbol = Symbol('__QUERY_MANAGER__');

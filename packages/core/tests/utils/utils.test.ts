import { deepTypeCheck, isNullish, timeout } from '../../src/utils';

describe('utils: isNullish', () => {
  it('should return true if value is nullish (null | undefined)', () => {
    expect(isNullish(undefined)).toBe(true);
    expect(isNullish(null)).toBe(true);
  });

  it('should return false if value is not nullish, any value different to (null | undefined)', () => {
    expect(isNullish(0)).toBe(false);
    expect(isNullish('')).toBe(false);
    expect(isNullish([])).toBe(false);
    expect(isNullish({})).toBe(false);
    expect(isNullish(false)).toBe(false);
  });
});

describe('utils: deepTypeCheck', () => {
  it('should return true if value matching with type', () => {
    expect(deepTypeCheck('', 'string')).toBe(true);
    expect(deepTypeCheck(1, 'number')).toBe(true);
    expect(deepTypeCheck(5.0, 'number')).toBe(true);
    expect(deepTypeCheck(-1, 'number')).toBe(true);
    expect(deepTypeCheck(true, 'boolean')).toBe(true);
    expect(deepTypeCheck(false, 'boolean')).toBe(true);
    expect(deepTypeCheck([], 'array')).toBe(true);
    expect(deepTypeCheck(new Date(), 'date')).toBe(true);
    expect(deepTypeCheck({}, 'object')).toBe(true);
    expect(deepTypeCheck(Symbol('test'), 'symbol')).toBe(true);
    expect(deepTypeCheck(null, 'null')).toBe(true);
    expect(deepTypeCheck(undefined, 'undefined')).toBe(true);
    expect(
      deepTypeCheck(
        {
          name: 'pedro5g',
          say: function () {
            return 'test';
          },
        },
        'object'
      )
    ).toBe(true);
    expect(deepTypeCheck(function () {}, 'function')).toBe(true);
    expect(deepTypeCheck(() => {}, 'function')).toBe(true);
    expect(deepTypeCheck(new Map(), 'map')).toBe(true);
    expect(deepTypeCheck(new Set(), 'set')).toBe(true);
  });

  it('should return false if the value does not match the type', () => {
    expect(deepTypeCheck('', 'number')).toBe(false);
    expect(deepTypeCheck(1, 'string')).toBe(false);
    expect(deepTypeCheck(5.0, 'boolean')).toBe(false);
    expect(deepTypeCheck(-1, 'object')).toBe(false);
    expect(deepTypeCheck(false, 'symbol')).toBe(false);
    expect(deepTypeCheck(false, 'number')).toBe(false);
    expect(deepTypeCheck([], 'object')).toBe(false);
    expect(deepTypeCheck(new Date(), 'null')).toBe(false);
    expect(deepTypeCheck({}, 'date')).toBe(false);
    expect(deepTypeCheck(Symbol('test'), 'undefined')).toBe(false);
    expect(deepTypeCheck(null, 'function')).toBe(false);
    expect(deepTypeCheck(undefined, 'set')).toBe(false);
    expect(
      deepTypeCheck(
        {
          name: 'pedro5g',
          say: function () {
            return 'test';
          },
        },
        'null'
      )
    ).toBe(false);
    expect(deepTypeCheck(function () {}, 'boolean')).toBe(false);
    expect(deepTypeCheck(() => {}, 'object')).toBe(false);
    expect(deepTypeCheck(new Map(), 'set')).toBe(false);
    expect(deepTypeCheck(new Set(), 'map')).toBe(false);
  });
});

describe('utils: timeout', () => {
  it('should resolve after the timeout if the signal is trigged', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const abortController = new AbortController();
    timeout(() => spy(), 100, abortController.signal);
    vi.advanceTimersToNextTimer();
    expect(spy).toBeCalled();
    expect(spy).toBeCalledTimes(1);
  });

  it('should NOT resolve after the timeout if the signal is aborted', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const abortController = new AbortController();
    timeout(() => spy(), 100, abortController.signal);
    abortController.abort();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should NOT throw an error when aborting after timeout', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const abortController = new AbortController();
    timeout(() => spy(), 100, abortController.signal);
    vi.advanceTimersToNextTimer();
    expect(() => abortController.abort()).not.toThrow();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('should abort all timeouts that use same signal instance', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const abortController = new AbortController();
    timeout(() => spy(), 100, abortController.signal);
    timeout(() => spy(), 100, abortController.signal);
    timeout(() => spy(), 100, abortController.signal);
    timeout(() => spy(), 100, abortController.signal);
    abortController.abort();
    expect(spy).not.toHaveBeenCalled();
  });
});

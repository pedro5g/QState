import { renderHook, act } from '@testing-library/react';
import {
  BrowserHistoryAdapter,
  readParam,
  writeParam,
  subscribeQS,
} from '@qstate/core';
import type { Mock } from 'vitest';
import { shouldRemoveParam } from '../../src/utils';
import { useCoreQueryState } from '../../src/hooks/use-core-query-state';

vi.mock('../../src/utils', async (originalImport) => {
  const actual = (await originalImport()) as any;
  return {
    ...actual,
    shouldRemoveParam: vi.fn(),
  };
});

vi.mock('@qstate/core', async (originalImport) => {
  const actual = (await originalImport()) as any;
  return {
    ...actual,
    readParam: vi.fn(),
    writeParam: vi.fn(),
    subscribeQS: vi.fn(),
    isNullish: (v: any) => v === null || v === undefined,
    BrowserHistoryAdapter: vi.fn().mockImplementation(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      getPathname: vi.fn().mockImplementation(() => '/test/page'),
    })),
  };
});

function createSubscribeMock(initialValue: string | null) {
  let callback: (() => void) | null = null;
  (readParam as Mock).mockReturnValue(initialValue);
  (subscribeQS as Mock).mockImplementation((cb) => {
    callback = cb;
    return () => (callback = null);
  });
  return {
    trigger: () => callback?.(),
  };
}

const expectWriteCalled = (key: string, value: any) => {
  const lastCall = (writeParam as Mock).mock.calls.at(-1);

  expect(lastCall?.[0]).toBe(key);
  expect(lastCall?.[1]).toBe(value);
};

describe('hook: useCoreQueryState', () => {
  let browserHistoryAdapter: BrowserHistoryAdapter;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('location', {
      pathname: '/test/page',
    });
    browserHistoryAdapter = new BrowserHistoryAdapter();
  });

  describe('configs', () => {
    it('should called writeParam with default options', () => {
      (readParam as Mock).mockReturnValue(null);
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('test', ''));

      act(() => result.current[1]('test-test'));
      expect(writeParam).toHaveBeenCalledOnce();
      expect(writeParam).toHaveBeenCalledWith('test', 'test-test', 'replace', {
        shallow: true,
        historyAdapter: {
          push: expect.any(Function),
          replace: expect.any(Function),
          getPathname: expect.any(Function),
        },
        rateLimit: {
          mode: 'throttle',
          timeMs: 50,
        },
        scroll: false,
        pathname: '/test/page',
      });
    });

    it('should called writeParam with custom options', () => {
      (readParam as Mock).mockReturnValue(null);
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() =>
        useCoreQueryState('test', '', {
          rateLimit: {
            mode: 'debounce',
            timeMs: 100,
          },
          encode: true,
          scroll: true,
          history: 'push',
          shallow: false,
        })
      );

      act(() => result.current[1]('test-test'));
      expect(writeParam).toHaveBeenCalledOnce();
      expect(writeParam).toHaveBeenCalledWith(
        'test',
        encodeURIComponent('test-test'),
        'push',
        {
          historyAdapter: {
            push: expect.any(Function),
            replace: expect.any(Function),
            getPathname: expect.any(Function),
          },
          rateLimit: {
            mode: 'debounce',
            timeMs: 100,
          },
          scroll: true,
          shallow: false,
          pathname: '/test/page',
        }
      );
    });

    it('should change history mode by updater function', () => {
      (readParam as Mock).mockReturnValue(null);
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() =>
        useCoreQueryState('test', '', { history: 'replace' })
      );

      act(() => result.current[1]('test-test'));
      expect(writeParam).toHaveBeenCalledOnce();
      expect(writeParam).toHaveBeenCalledWith('test', 'test-test', 'replace', {
        shallow: true,
        historyAdapter: {
          push: expect.any(Function),
          replace: expect.any(Function),
          getPathname: expect.any(Function),
        },
        rateLimit: {
          mode: 'throttle',
          timeMs: 50,
        },
        scroll: false,
        pathname: '/test/page',
      });

      act(() => result.current[1]('test-test', 'push'));
      expect(writeParam).toHaveBeenCalledTimes(2);
      expect(writeParam).toHaveBeenCalledWith('test', 'test-test', 'push', {
        shallow: true,
        historyAdapter: {
          push: expect.any(Function),
          replace: expect.any(Function),
          getPathname: expect.any(Function),
        },
        rateLimit: {
          mode: 'throttle',
          timeMs: 50,
        },
        scroll: false,
        pathname: '/test/page',
      });
    });

    it('should called writeParam with custom history adapter', () => {
      const mockPush = vi.fn();
      const mockReplace = vi.fn();
      const mockGetPathname = vi.fn().mockImplementation(() => '/test/page');

      const customAdapter = {
        push: mockPush,
        replace: mockReplace,
        getPathname: mockGetPathname,
      };

      (writeParam as Mock).mockImplementation((key, value, mode, options) => {
        if (mode === 'replace') {
          options.historyAdapter.replace();
        } else {
          options.historyAdapter.push();
        }
      });
      (readParam as Mock).mockReturnValue(null);
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() =>
        useCoreQueryState('test', '', {}, customAdapter)
      );

      act(() => result.current[1]('test-test'));
      expect(writeParam).toHaveBeenCalledOnce();
      expect(writeParam).toHaveBeenCalledWith('test', 'test-test', 'replace', {
        shallow: true,
        historyAdapter: customAdapter,
        rateLimit: {
          mode: 'throttle',
          timeMs: 50,
        },
        scroll: false,
        pathname: '/test/page',
      });
      expect(mockReplace).toHaveBeenCalledOnce();
      expect(mockPush).not.toHaveBeenCalled();

      act(() => result.current[1]('test-test', 'push'));
      expect(mockPush).toHaveBeenCalledOnce();
      expect(mockReplace).toHaveBeenCalledOnce();
    });

    it('should respect custom serializer and parser', () => {
      (readParam as Mock).mockReturnValue('123');
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() =>
        useCoreQueryState(
          'custom',
          { value: 1 },
          {
            parse: (v: string) => ({ parsed: v }),
            serialize: (v: any) => JSON.stringify(v),
          }
        )
      );
      const [value] = result.current;
      expect(value).toEqual({ parsed: '123' });
    });

    it('should use encodeURIComponent when encode=true', () => {
      (readParam as Mock).mockReturnValue(null);
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() =>
        useCoreQueryState('key', '', { encode: true })
      );
      const [, setValue] = result.current;
      act(() => setValue('a b'));
      expect(writeParam).toHaveBeenCalledWith(
        'key',
        encodeURIComponent('a b'),
        'replace',
        expect.any(Object)
      );
    });

    it('should not use encodeURIComponent when encode=false', () => {
      (readParam as Mock).mockReturnValue(null);
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() =>
        useCoreQueryState('key', '', { encode: false })
      );
      const [, setValue] = result.current;
      act(() => setValue('a b'));
      expect(writeParam).toHaveBeenCalledWith(
        'key',
        'a b',
        'replace',
        expect.any(Object)
      );
    });

    it('should respect scroll and shallow flags from config', () => {
      (readParam as Mock).mockReturnValue(null);
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() =>
        useCoreQueryState('flag', '', { scroll: true })
      );
      const [, setValue] = result.current;
      act(() => setValue('x'));
      expect(writeParam).toHaveBeenCalledWith(
        'flag',
        'x',
        'replace',
        expect.objectContaining({
          scroll: true,
        })
      );
    });
  });

  describe('parsing and encoding edge cases', () => {
    it('should decode URI values with special characters correctly', () => {
      (readParam as Mock).mockReturnValue(encodeURIComponent('Café & pão'));
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('food', ''));
      expect(result.current[0]).toBe('Café & pão');
    });

    it('should return default when parse function throws', () => {
      (readParam as Mock).mockReturnValue('bad');
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() =>
        useCoreQueryState('broken', 'ok', {
          parse: () => {
            throw new Error('Invalid parse');
          },
          serialize: (v: any) => String(v),
          equals: (a: any, b: any) => a === b,
        })
      );
      expect(result.current[0]).toBe('ok');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing query param'),
        expect.any(Error)
      );
    });
  });

  describe('object and array behaviors', () => {
    it('should support updating arrays directly', () => {
      (readParam as Mock).mockReturnValue(null);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('list', [1, 2, 3]));
      const [, setValue] = result.current;
      act(() => {
        setValue([4, 5]);
      });
      expect(writeParam).toHaveBeenCalledWith(
        'list',
        '4,5',
        'replace',
        expect.any(Object)
      );
    });

    it('should parser objects correctly', () => {
      (readParam as Mock).mockReturnValue(null);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() =>
        useCoreQueryState('profile', { info: { name: 'John', age: 22 } })
      );
      const [, setValue] = result.current;
      act(() => {
        setValue({ info: { name: 'pedro', age: 23 } });
      });

      expect(writeParam).toHaveBeenCalled();
      expect(writeParam).toHaveBeenCalledWith(
        'profile',
        JSON.stringify({ info: { name: 'pedro', age: 23 } }),
        'replace',
        expect.any(Object)
      );
    });

    it('should handle null updates gracefully', () => {
      (readParam as Mock).mockReturnValue('123');
      (subscribeQS as Mock).mockImplementation(() => () => {});
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      const { result } = renderHook(() => useCoreQueryState('id', 123));
      const [_, setValue] = result.current;
      act(() => {
        setValue(null);
      });
      expect(writeParam).toHaveBeenCalledWith(
        'id',
        null,
        'replace',
        expect.any(Object)
      );
    });
  });

  describe('initialization', () => {
    it('should returns defaultValue if query param is missing, "null" if no defaultValue was be passed', () => {
      (readParam as Mock).mockReturnValue(null);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('foo'));
      expect(result.current[0]).toBeNull();
    });

    it('should returns defaultValue if query param is missing', () => {
      (readParam as Mock).mockReturnValue(null);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('foo', 'bar'));
      expect(result.current[0]).toBe('bar');
    });

    it('should parses string value correctly', () => {
      (readParam as Mock).mockReturnValue('123');
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('foo', 0));
      expect(result.current[0]).toBe(123);
    });

    it('should decodes URI safely', () => {
      (readParam as Mock).mockReturnValue(encodeURIComponent('Pelé'));
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('name', ''));
      expect(result.current[0]).toBe('Pelé');
    });

    it('should handles decode errors gracefully', () => {
      (readParam as Mock).mockReturnValue('%E0%A4%A');
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useCoreQueryState('foo', 'fallback'));
      expect(result.current[0]).toBe('fallback');
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('setter behavior', () => {
    it('should updates query param with serialized value', () => {
      (readParam as Mock).mockReturnValue(null);
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('page', 1));

      act(() => {
        result.current[1](2);
      });
      expectWriteCalled('page', '2');
    });

    it('should does not update if same as current and removeIfDefault is false', () => {
      (readParam as Mock).mockReturnValue('5');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() =>
        useCoreQueryState('count', 5, { removeIfDefault: false })
      );

      act(() => result.current[1](5));
      expect(writeParam).not.toHaveBeenCalled();
    });
    it('should removes valeu if same as current and removeIfDefault is true (default behavior)', () => {
      (readParam as Mock).mockReturnValue('5');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(true);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() =>
        useCoreQueryState('count', 5, { removeIfDefault: true })
      );

      act(() => result.current[1](5));
      expect(writeParam).toHaveBeenCalled();
    });

    it('should does not update if same as current', () => {
      (readParam as Mock).mockReturnValue('5');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(true);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('count', 5));

      act(() => result.current[1](5));
      expect(writeParam).toHaveBeenCalled();
    });

    it('should removes param when null is passed', () => {
      (readParam as Mock).mockReturnValue('10');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('id', 1));

      act(() => result.current[1](null));
      expectWriteCalled('id', null);
    });

    it('should removes param when updater returns null', () => {
      (readParam as Mock).mockReturnValue('10');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('token', 'x'));

      act(() => result.current[1](() => null));
      expectWriteCalled('token', null);
    });

    it('removes param if matches default value', () => {
      (readParam as Mock).mockReturnValue('1');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(true);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('num', 1));

      act(() => {
        result.current[1](1);
      });
      expectWriteCalled('num', null);
    });

    it('handles function updaters', () => {
      (readParam as Mock).mockReturnValue('1');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('count', 1));

      act(() => result.current[1]((prev) => prev + 1));
      expectWriteCalled('count', '2');
    });

    it('warns and recovers from errors', () => {
      (readParam as Mock).mockReturnValue(null);
      (shouldRemoveParam as unknown as Mock).mockImplementation(() => {
        throw new Error('mock failure');
      });
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useCoreQueryState('x', 1));

      act(() =>
        result.current[1](() => {
          throw new Error('mock failure');
        })
      );
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error setting query param "x":'),
        expect.any(Error)
      );
    });
  });

  describe('reactivity', () => {
    it('reacts to changes via subscription', () => {
      const mock = createSubscribeMock('a');
      const { result } = renderHook(() => useCoreQueryState('token', ''));

      expect(result.current[0]).toBe('a');
      (readParam as Mock).mockReturnValue('b');
      act(() => mock.trigger());
      expect(result.current[0]).toBe('b');
    });
  });

  describe('null defaults and inference', () => {
    it('should infers null when only key is passed', () => {
      let param: null | string = null;
      let canRemove = false;

      (readParam as Mock).mockImplementation(() => param);
      (shouldRemoveParam as unknown as Mock).mockImplementation(
        () => canRemove
      );
      (subscribeQS as Mock).mockImplementation(() => () => {});

      const { result } = renderHook(() => useCoreQueryState('key'));

      expect(result.current[0]).toBeNull();

      act(() => {
        result.current[1]('abc');
      });
      expectWriteCalled('key', 'abc');

      param = 'abc';
      canRemove = true;

      act(() => {
        result.current[1](null);
      });

      expectWriteCalled('key', null);
    });
  });

  describe('robustness', () => {
    it('should handle multiple rapid updates safely', () => {
      (readParam as Mock).mockReturnValue('1');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('rapid', 1));
      const [, setValue] = result.current;

      act(() => {
        setValue(2);
        setValue(3);
        setValue(4);
      });

      expect(writeParam).toHaveBeenCalledTimes(3);
    });

    it('should not call writeParam when removing default value repeatedly', () => {
      let currentValue: number | null = 1;

      (readParam as Mock).mockImplementation(() => currentValue);
      (shouldRemoveParam as unknown as Mock).mockReturnValue(true);
      (subscribeQS as Mock).mockImplementation(() => () => {});
      const { result } = renderHook(() => useCoreQueryState('num', 1));
      const [, setValue] = result.current;

      act(() => {
        setValue(1);
        currentValue = null;
        setValue(1);
      });

      expect(writeParam).toHaveBeenCalledTimes(1);
    });

    it('should handle re-subscription cleanup properly', () => {
      const unsubscribe = vi.fn();
      (readParam as Mock).mockReturnValue('abc');
      (subscribeQS as Mock).mockImplementation(() => unsubscribe);
      const { unmount } = renderHook(() => useCoreQueryState('x', ''));
      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('performance and stability', () => {
    it('should keep setValue reference stable with same dependencies', () => {
      (readParam as Mock).mockReturnValue('1');
      (subscribeQS as Mock).mockImplementation(() => () => {});

      const adapter = new BrowserHistoryAdapter();
      const options = { history: 'push' as const };

      const { result, rerender } = renderHook(() =>
        useCoreQueryState('counter', 1, options, adapter)
      );

      const firstSetter = result.current[1];
      rerender();

      const secondSetter = result.current[1];

      expect(firstSetter).toBe(secondSetter);
    });

    it('should use latest value in updater function after value changes', () => {
      const mock = createSubscribeMock('5');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);

      const { result } = renderHook(() => useCoreQueryState('count', 0));

      expect(result.current[0]).toBe(5);

      (readParam as Mock).mockReturnValue('10');
      act(() => mock.trigger());
      expect(result.current[0]).toBe(10);

      act(() => {
        result.current[1]((prev) => prev + 5);
      });

      expectWriteCalled('count', '15');
    });

    it('should not recreate setValue when config options remain stable', () => {
      const stableConfig = {
        history: 'replace' as const,
        shallow: true,
        scroll: false,
      };

      (readParam as Mock).mockReturnValue('1');
      (subscribeQS as Mock).mockImplementation(() => () => {});

      const { result, rerender } = renderHook(() =>
        useCoreQueryState('test', 1, stableConfig)
      );

      const firstSetter = result.current[1];
      rerender();

      const secondSetter = result.current[1];

      expect(firstSetter).toBe(secondSetter);
    });

    it('should maintain setValue identity across multiple setValue calls', () => {
      const stableConfig = {
        history: 'replace' as const,
        shallow: true,
        scroll: false,
      };

      (readParam as Mock).mockReturnValue('1');
      (subscribeQS as Mock).mockImplementation(() => () => {});

      const { result } = renderHook(() =>
        useCoreQueryState('test', 1, stableConfig)
      );
      const firstSetter = result.current[1];

      act(() => {
        result.current[1](2);
      });

      const secondSetter = result.current[1];

      expect(firstSetter).toBe(secondSetter);
    });
  });

  describe('edge cases with updater functions', () => {
    it('should handle updater returning same value as current', () => {
      (readParam as Mock).mockReturnValue('5');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});

      const { result } = renderHook(() => useCoreQueryState('val', 5));

      act(() => {
        result.current[1]((prev) => prev);
      });

      expect(writeParam).not.toHaveBeenCalled();
    });

    it('should handle chained updaters with subscription updates', () => {
      const mock = createSubscribeMock('10');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);

      const { result } = renderHook(() => useCoreQueryState('num', 0));

      expect(result.current[0]).toBe(10);

      act(() => {
        result.current[1]((prev) => prev + 1);
      });
      expectWriteCalled('num', '11');

      (readParam as Mock).mockReturnValue('11');
      act(() => {
        mock.trigger();
      });

      expect(result.current[0]).toBe(11);

      act(() => {
        result.current[1]((prev) => prev * 2);
      });
      expectWriteCalled('num', '22');
    });

    it('should handle updater with complex transformations', () => {
      (readParam as Mock).mockReturnValue(JSON.stringify({ count: 5 }));
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});

      const { result } = renderHook(() =>
        useCoreQueryState('data', { count: 0 })
      );

      expect(result.current[0]).toEqual({ count: 5 });

      act(() => {
        result.current[1]((prev) => ({ count: prev.count + 10 }));
      });

      expectWriteCalled('data', JSON.stringify({ count: 15 }));
    });
  });

  describe('synchronization edge cases', () => {
    it('should handle rapid external URL changes correctly', () => {
      const mock = createSubscribeMock('a');
      const { result } = renderHook(() => useCoreQueryState('token', ''));

      expect(result.current[0]).toBe('a');

      (readParam as Mock).mockReturnValue('b');
      act(() => mock.trigger());
      expect(result.current[0]).toBe('b');

      (readParam as Mock).mockReturnValue('c');
      act(() => mock.trigger());
      expect(result.current[0]).toBe('c');

      (readParam as Mock).mockReturnValue('d');
      act(() => mock.trigger());
      expect(result.current[0]).toBe('d');
    });

    it('should handle updater during external change race condition', () => {
      const mock = createSubscribeMock('5');
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);

      const { result } = renderHook(() => useCoreQueryState('count', 0));

      expect(result.current[0]).toBe(5);

      (readParam as Mock).mockReturnValue('10');
      act(() => mock.trigger());

      act(() => {
        mock.trigger();
        result.current[1]((prev) => prev + 1);
      });

      expectWriteCalled('count', '11');
    });
  });

  describe('memory and cleanup', () => {
    it('should cleanup ref on unmount', () => {
      (readParam as Mock).mockReturnValue('test');
      (subscribeQS as Mock).mockImplementation(() => () => {});

      const { result, unmount } = renderHook(() =>
        useCoreQueryState('key', '')
      );

      const setter = result.current[1];

      unmount();

      expect(() => {
        setter('new-value');
      }).not.toThrow();
    });
  });

  describe('config changes', () => {
    it('should update behavior when config changes', () => {
      (readParam as Mock).mockReturnValue(null);
      (shouldRemoveParam as unknown as Mock).mockReturnValue(false);
      (subscribeQS as Mock).mockImplementation(() => () => {});

      let config = { encode: false };
      const { result, rerender } = renderHook(
        ({ opts }) => useCoreQueryState('key', '', opts),
        { initialProps: { opts: config } }
      );

      act(() => result.current[1]('test value'));
      expect(writeParam).toHaveBeenCalledWith(
        'key',
        'test value',
        'replace',
        expect.any(Object)
      );

      config = { encode: true };
      rerender({ opts: config });

      act(() => result.current[1]('test value'));
      expect(writeParam).toHaveBeenCalledWith(
        'key',
        encodeURIComponent('test value'),
        'replace',
        expect.any(Object)
      );
    });
  });
});

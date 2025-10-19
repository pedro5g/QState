import { renderHook } from '@testing-library/react';
import { createUseQState } from '../../src/hooks/create-use-qstate';
import { resolveArgs } from '../../src/utils';
import { useQStateCore } from '../../src/hooks/use-qstate-core';
import { BrowserHistoryAdapter } from '@query-state/core';

vi.mock('../../src/utils', () => ({
  resolveArgs: vi.fn(),
}));

vi.mock('../../src/hooks/use-qstate-core', () => ({
  useQStateCore: vi.fn(),
}));

vi.mock('@query-state/core', () => ({
  BrowserHistoryAdapter: vi.fn().mockImplementation(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
  qsParserBoolean: vi.fn(),
  qsParserStringLiteral: vi.fn(),
}));

describe('useQueryState hook', () => {
  const mockSet = vi.fn();
  const mockValue = 'mocked';
  const mockAdapter = new BrowserHistoryAdapter();

  beforeEach(() => {
    vi.clearAllMocks();
    (useQStateCore as any).mockReturnValue([mockValue, mockSet]);
  });

  describe('baseline', () => {
    it('should handle single key with string default', () => {
      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'page',
        defaultValue: '1',
        config: {},
      });

      const useQueryState = createUseQState(mockAdapter);
      const { result } = renderHook(() => useQueryState('page', '1'));

      expect(useQStateCore).toHaveBeenCalledWith('page', '1', {}, mockAdapter);
      expect(result.current[0]).toBe(mockValue);
      expect(result.current[1]).toBe(mockSet);
    });

    it('should handle single key with object config', () => {
      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'status',
        defaultValue: 'active',
        config: { parse: vi.fn() },
      });

      const useQueryState = createUseQState(mockAdapter);
      const { result } = renderHook(() =>
        useQueryState('status', {
          defaultValue: 'active',
          parse: (v: string) => v,
        })
      );

      expect(useQStateCore).toHaveBeenCalledWith(
        'status',
        'active',
        { parse: expect.any(Function) },
        mockAdapter
      );
      expect(result.current[0]).toBe(mockValue);
    });

    it('should handle multi-key object config', () => {
      (resolveArgs as any).mockReturnValue({
        isObject: true,
        *[Symbol.iterator]() {
          yield { key: 'page', defaultValue: 1, config: {} };
          yield { key: 'status', defaultValue: 'active', config: {} };
        },
      });

      const useQueryState = createUseQState(mockAdapter);
      const { result } = renderHook(() =>
        useQueryState({
          page: 1,
          status: { defaultValue: 'active', parse: (v: string) => v },
        })
      );

      expect(useQStateCore).toHaveBeenCalledTimes(2);
      expect(useQStateCore).toHaveBeenNthCalledWith(
        1,
        'page',
        1,
        expect.any(Object),
        expect.any(Object)
      );
      expect(useQStateCore).toHaveBeenNthCalledWith(
        2,
        'status',
        'active',
        expect.any(Object),
        expect.any(Object)
      );

      const [values, setters] = result.current;
      expect(values).toHaveProperty('page', mockValue);
      expect(values).toHaveProperty('status', mockValue);
      expect(setters).toHaveProperty('page', mockSet);
    });

    it('should work with parser overload', () => {
      const mockParser = {
        parse: (v: string) => (v === 'true' ? true : false),
      };
      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'flag',
        defaultValue: false,
        config: mockParser,
      });

      const useQueryState = createUseQState(mockAdapter);
      const { result } = renderHook(() => useQueryState('flag', mockParser));

      expect(useQStateCore).toHaveBeenCalledWith(
        'flag',
        false,
        mockParser,
        mockAdapter
      );
      expect(result.current[0]).toBe(mockValue);
    });
  });

  describe('edge cases', () => {
    it('should handle empty object config', () => {
      (resolveArgs as any).mockReturnValue({
        isObject: true,
        *[Symbol.iterator]() {},
      });

      const useQueryState = createUseQState(mockAdapter);
      const { result } = renderHook(() => useQueryState({}));

      expect(useQStateCore).not.toHaveBeenCalled();
      expect(result.current[0]).toEqual({});
      expect(result.current[1]).toEqual({});
    });

    it('should handle single key without default value', () => {
      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'search',
        defaultValue: undefined,
        config: {},
      });

      const useQueryState = createUseQState(mockAdapter);
      const { result } = renderHook(() => useQueryState('search'));

      expect(useQStateCore).toHaveBeenCalledWith(
        'search',
        undefined,
        {},
        mockAdapter
      );
      expect(result.current[0]).toBe(mockValue);
    });

    it('should handle key with null default value', () => {
      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'filter',
        defaultValue: null,
        config: {},
      });

      const useQueryState = createUseQState(mockAdapter);
      renderHook(() => useQueryState('filter', null));

      expect(useQStateCore).toHaveBeenCalledWith(
        'filter',
        null,
        {},
        mockAdapter
      );
    });

    it('should handle complex nested objects as default values', () => {
      const complexDefault = {
        user: { name: 'John', age: 30 },
        filters: ['active', 'pending'],
      };

      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'state',
        defaultValue: complexDefault,
        config: {},
      });

      const useQueryState = createUseQState(mockAdapter);
      renderHook(() => useQueryState('state', complexDefault));

      expect(useQStateCore).toHaveBeenCalledWith(
        'state',
        complexDefault,
        {},
        mockAdapter
      );
    });

    it('should handle arrays as default values', () => {
      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'tags',
        defaultValue: ['react', 'typescript'],
        config: {},
      });

      const useQueryState = createUseQState(mockAdapter);
      renderHook(() => useQueryState('tags', ['react', 'typescript']));

      expect(useQStateCore).toHaveBeenCalledWith(
        'tags',
        ['react', 'typescript'],
        {},
        mockAdapter
      );
    });
  });

  describe('multi-key behavior', () => {
    it('should maintain separate state for multiple keys', () => {
      const mockSet1 = vi.fn();
      const mockSet2 = vi.fn();

      (useQStateCore as any)
        .mockReturnValueOnce(['value1', mockSet1])
        .mockReturnValueOnce(['value2', mockSet2]);

      (resolveArgs as any).mockReturnValue({
        isObject: true,
        *[Symbol.iterator]() {
          yield { key: 'key1', defaultValue: 'default1', config: {} };
          yield { key: 'key2', defaultValue: 'default2', config: {} };
        },
      });

      const useQueryState = createUseQState(mockAdapter);
      const { result } = renderHook(() =>
        useQueryState({
          key1: 'default1',
          key2: 'default2',
        })
      );

      const [values, setters] = result.current;

      expect(values.key1).toBe('value1');
      expect(values.key2).toBe('value2');
      expect(setters.key1).toBe(mockSet1);
      expect(setters.key2).toBe(mockSet2);
    });

    it('should handle mixed primitive and config object values', () => {
      (resolveArgs as any).mockReturnValue({
        isObject: true,
        *[Symbol.iterator]() {
          yield { key: 'page', defaultValue: 1, config: {} };
          yield {
            key: 'status',
            defaultValue: 'active',
            config: { parse: vi.fn() },
          };
        },
      });

      const useQueryState = createUseQState(mockAdapter);
      renderHook(() =>
        useQueryState({
          page: 1,
          status: {
            defaultValue: 'active',
            parse: (v: string) => v,
          },
        })
      );

      expect(useQStateCore).toHaveBeenCalledTimes(2);
      expect(useQStateCore).toHaveBeenNthCalledWith(
        1,
        'page',
        1,
        {},
        mockAdapter
      );
      expect(useQStateCore).toHaveBeenNthCalledWith(
        2,
        'status',
        'active',
        { parse: expect.any(Function) },
        mockAdapter
      );
    });

    it('should handle many keys efficiently', () => {
      const keys = Array.from({ length: 20 }, (_, i) => `key${i}`);

      (resolveArgs as any).mockReturnValue({
        isObject: true,
        *[Symbol.iterator]() {
          for (const key of keys) {
            yield { key, defaultValue: `value${key}`, config: {} };
          }
        },
      });

      const config = Object.fromEntries(keys.map((k) => [k, `value${k}`]));

      const useQueryState = createUseQState(mockAdapter);
      const { result } = renderHook(() => useQueryState(config));

      expect(useQStateCore).toHaveBeenCalledTimes(20);

      const [values, setters] = result.current;
      keys.forEach((key) => {
        expect(values).toHaveProperty(key, mockValue);
        expect(setters).toHaveProperty(key, mockSet);
      });
    });
  });

  describe('memoization', () => {
    it('should memoize entries based on config keys', () => {
      let iteratorCallCount = 0;

      (resolveArgs as any).mockReturnValue({
        isObject: true,
        *[Symbol.iterator]() {
          iteratorCallCount++;
          yield { key: 'page', defaultValue: 1, config: {} };
        },
      });

      const useQueryState = createUseQState(mockAdapter);
      const { rerender } = renderHook(() => useQueryState({ page: 1 }));

      expect(iteratorCallCount).toBe(1);

      rerender();

      expect(iteratorCallCount).toBe(1);
    });
  });

  describe('adapter usage', () => {
    it('should pass custom adapter to all useQStateCore calls', () => {
      const customAdapter = {
        push: vi.fn(),
        replace: vi.fn(),
      };

      (resolveArgs as any).mockReturnValue({
        isObject: true,
        *[Symbol.iterator]() {
          yield { key: 'key1', defaultValue: 1, config: {} };
          yield { key: 'key2', defaultValue: 2, config: {} };
        },
      });

      const useQueryState = createUseQState(customAdapter as any);
      renderHook(() => useQueryState({ key1: 1, key2: 2 }));

      expect(useQStateCore).toHaveBeenCalledWith('key1', 1, {}, customAdapter);
      expect(useQStateCore).toHaveBeenCalledWith('key2', 2, {}, customAdapter);
    });

    it('should work with different adapter instances', () => {
      const adapter1 = new BrowserHistoryAdapter();
      const adapter2 = new BrowserHistoryAdapter();

      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'test',
        defaultValue: 'value',
        config: {},
      });

      const useQueryState1 = createUseQState(adapter1);
      const useQueryState2 = createUseQState(adapter2);

      renderHook(() => useQueryState1('test', 'value'));
      expect(useQStateCore).toHaveBeenLastCalledWith(
        'test',
        'value',
        {},
        adapter1
      );

      renderHook(() => useQueryState2('test', 'value'));
      expect(useQStateCore).toHaveBeenLastCalledWith(
        'test',
        'value',
        {},
        adapter2
      );
    });
  });

  describe('type safety coverage', () => {
    it('should handle boolean defaults', () => {
      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'enabled',
        defaultValue: true,
        config: {},
      });

      const useQueryState = createUseQState(mockAdapter);
      renderHook(() => useQueryState('enabled', true));

      expect(useQStateCore).toHaveBeenCalledWith(
        'enabled',
        true,
        {},
        mockAdapter
      );
    });

    it('should handle number defaults', () => {
      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'count',
        defaultValue: 42,
        config: {},
      });

      const useQueryState = createUseQState(mockAdapter);
      renderHook(() => useQueryState('count', 42));

      expect(useQStateCore).toHaveBeenCalledWith('count', 42, {}, mockAdapter);
    });

    it('should handle date defaults', () => {
      const date = new Date('2024-01-01');

      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'date',
        defaultValue: date,
        config: {},
      });

      const useQueryState = createUseQState(mockAdapter);
      renderHook(() => useQueryState('date', date));

      expect(useQStateCore).toHaveBeenCalledWith('date', date, {}, mockAdapter);
    });
  });

  describe('config options passthrough', () => {
    it('should pass all config options to useQStateCore', () => {
      const fullConfig = {
        parse: vi.fn(),
        serialize: vi.fn(),
        equals: vi.fn(),
        history: 'push' as const,
        shallow: false,
        scroll: true,
        encode: true,
        removeIfDefault: false,
      };

      (resolveArgs as any).mockReturnValue({
        isObject: false,
        key: 'test',
        defaultValue: 'value',
        config: fullConfig,
      });

      const useQueryState = createUseQState(mockAdapter);
      renderHook(() => useQueryState('test', 'value', fullConfig));

      expect(useQStateCore).toHaveBeenCalledWith(
        'test',
        'value',
        fullConfig,
        mockAdapter
      );
    });
  });
});

import {
  defaultRateLimit,
  qsParserBoolean,
  qsParserDateTime,
  qsParserInteger,
  qsParserString,
  type RateLimitConfig,
} from '@query-state/core';
import {
  createEqualityChecker,
  shouldRemoveParam,
  resolveArgs,
  NO_PARAM,
  normalizeOptions,
  defaultParsers,
} from '../../src/utils';

describe('utils: createEqualityChecker', () => {
  it('should return true when both values are strictly equal', () => {
    const eq = createEqualityChecker<number>();
    expect(eq(5, 5)).toBe(true);
    expect(eq('a' as any, 'a' as any)).toBe(true);
  });

  it('should return false when one value is nullish', () => {
    const eq = createEqualityChecker<number>();
    expect(eq(null, 5)).toBe(false);
    expect(eq(undefined as any, 5)).toBe(false);
    expect(eq(5, null)).toBe(false);
  });

  it('should return result of custom equals when provided', () => {
    const custom = vi.fn((a: number, b: number) => a + b === 10);
    const eq = createEqualityChecker(custom);
    expect(eq(3, 7)).toBe(true);
    expect(eq(2, 5)).toBe(false);
    expect(custom).toHaveBeenCalledTimes(2);
  });

  it('should fallback to Object.is when not nullish and no custom equals', () => {
    const eq = createEqualityChecker<number>();

    expect(eq(0, -0)).toBe(false);
    expect(eq(NaN, NaN)).toBe(true);
  });
});

describe('utils: shouldRemoveParam', () => {
  const eq = (a: any, b: any) => a === b;

  it('should return true if value is nullish', () => {
    expect(shouldRemoveParam(null, 1, false, eq)).toBe(true);
    expect(shouldRemoveParam(undefined as any, 1, false, eq)).toBe(true);
  });

  it('should return true if removeIfDefault is true and value equals defaultValue', () => {
    expect(shouldRemoveParam(5, 5, true, eq)).toBe(true);
  });

  it('should return false if value is not nullish and removeIfDefault is false', () => {
    expect(shouldRemoveParam(5, 5, false, eq)).toBe(false);
  });

  it('should return false if removeIfDefault is true but value not equal to defaultValue', () => {
    expect(shouldRemoveParam(3, 5, true, eq)).toBe(false);
  });
});

describe('utils: resolveArgs', () => {
  it('should handle object argument with mixed value types', () => {
    const args = [
      {
        user: 'pedro',
        age: { defaultValue: 21, parse: (v: string) => Number(v) },
      },
    ] as unknown as IArguments;

    const result = resolveArgs(args) as any;
    expect(result.isObject).toBe(true);

    const entries = Array.from(result);
    expect(entries).toHaveLength(2);

    const [user, age] = entries as any;
    expect(user.key).toBe('user');
    expect(user.defaultValue).toBe('pedro');

    expect(age.key).toBe('age');
    expect(age.defaultValue).toBe(21);
    expect(typeof age.config.parse).toBe('function');
  });

  it('should handle key + object args', () => {
    const args = [
      'theme',
      { defaultValue: 'dark', shallow: true },
    ] as unknown as IArguments;
    const result = resolveArgs(args) as any;
    expect(result.isObject).toBe(false);
    expect(result.key).toBe('theme');
    expect(result.defaultValue).toBe('dark');
    expect(result.config.shallow).toBe(true);
  });

  it('should handle key + primitive defaultValue', () => {
    const args = ['page', 1] as unknown as IArguments;
    const result = resolveArgs<number>(args) as any;
    expect(result.isObject).toBe(false);
    expect(result.key).toBe('page');
    expect(result.defaultValue).toBe(1);
  });

  it('should handle key + defaultValue + config', () => {
    const args = ['count', 10, { shallow: false }] as unknown as IArguments;
    const result = resolveArgs<number>(args) as any;
    expect(result.isObject).toBe(false);
    expect(result.key).toBe('count');
    expect(result.defaultValue).toBe(10);
    expect(result.config.shallow).toBe(false);
  });

  it('should fallback safely even with unexpected args', () => {
    const args = ['unexpected'] as unknown as IArguments;
    const result = resolveArgs<any>(args) as any;
    expect(result.isObject).toBe(false);
    expect(result.key).toBe('unexpected');
  });
});

describe('utils: NO_PARAM', () => {
  it('should be a unique symbol', () => {
    expect(typeof NO_PARAM).toBe('symbol');
    expect(NO_PARAM.description).toBe('qstate.no_param');
  });
});

describe('utils: defaultParsers', () => {
  it('should return qsParserString for string default value', () => {
    expect(defaultParsers('foo')).toBe(qsParserString);
  });

  it('should return qsParserInteger for number default value', () => {
    expect(defaultParsers(10)).toBe(qsParserInteger);
  });

  it('should return qsParserBoolean for boolean default value', () => {
    expect(defaultParsers(false)).toBe(qsParserBoolean);
  });

  it('should return qsParserDateTime for Date default value', () => {
    expect(defaultParsers(new Date())).toBe(qsParserDateTime);
  });

  it('should return qsParserArray for array of numbers', () => {
    const parser = defaultParsers([1, 2, 3]);
    expect(parser).toBeDefined();
    expect((parser as any).serialize([4, 5, 6])).toBe('4,5,6');
  });

  it('should return qsParserArray for array of strings', () => {
    const parser = defaultParsers(['a', 'b', 'c']);
    expect(parser).toBeDefined();
    expect((parser as any).serialize(['x', 'y'])).toBe('x,y');
  });

  it('should return qsParserJson for plain objects', () => {
    const parser = defaultParsers({ id: 1, name: 'Pedro' });
    expect(parser).toBeDefined();
    expect((parser as any).serialize({ id: 1 })).toBe(
      JSON.stringify({ id: 1 })
    );
  });

  it('should return qsParserArray of qsParserJson for array of objects', () => {
    const parser = defaultParsers([{ id: 1 }, { id: 2 }]);
    expect(parser).toBeDefined();
    expect((parser as any).serialize([{ id: 1 }])).toContain(
      JSON.stringify({ id: 1 })
    );
  });
});

describe('utils: normalizeOptions', () => {
  it('should return default options when no options are provided', () => {
    const result = normalizeOptions<number>();

    expect(typeof result.parse).toBe('function');
    expect(typeof result.serialize).toBe('function');
    expect(result.history).toBe('replace');
    expect(result.removeIfDefault).toBe(true);
    expect(result.shallow).toBe(true);
    expect(result.scroll).toBe(false);
    expect(result.encode).toBe(false);
    expect(typeof result.checkEqual).toBe('function');
    expect(result.rateLimit).toBe(defaultRateLimit);
  });

  it('should use provided parse and serialize functions', () => {
    const parse = vi.fn((v: string) => Number(v));
    const serialize = vi.fn((v: number) => v.toString());

    const result = normalizeOptions<number>({ parse, serialize });

    expect(result.parse).toBe(parse);
    expect(result.serialize).toBe(serialize);
  });

  it('should fallback to default parse and serialize if not provided', () => {
    const result = normalizeOptions<number>({});

    expect(result.parse('123')).toBe('123');
    expect(result.serialize(456)).toBe('456');
  });

  it('should use provided primitive options (history, scroll, etc.)', () => {
    const result = normalizeOptions({
      history: 'push',
      removeIfDefault: false,
      shallow: false,
      scroll: true,
      encode: true,
    });

    expect(result.history).toBe('push');
    expect(result.removeIfDefault).toBe(false);
    expect(result.shallow).toBe(false);
    expect(result.scroll).toBe(true);
    expect(result.encode).toBe(true);
  });

  it('should create equality checker when equals function is provided', () => {
    const equals = (a: number, b: number) => a === b;
    const result = normalizeOptions<number>({ equals });

    expect(result.checkEqual).not.toBe(createEqualityChecker<number>());
    expect(result.checkEqual(1, 1)).toBe(true);
  });

  it('should reuse default checkEqual when equals is not provided', () => {
    const result = normalizeOptions<number>();
    const other = normalizeOptions<number>();
    expect(result.checkEqual.toString()).toBe(other.checkEqual.toString());
  });

  it('should merge custom rateLimit with defaultRateLimit if timeMs differs', () => {
    const customRateLimit: RateLimitConfig = { timeMs: 200, mode: 'debounce' };
    const result = normalizeOptions({ rateLimit: customRateLimit });

    expect(result.rateLimit).not.toBe(defaultRateLimit);
    expect(result.rateLimit.mode).toBe('debounce');
    expect(result.rateLimit.timeMs).toBe(200);
  });

  it('should reuse defaultRateLimit when timeMs is equal', () => {
    const result = normalizeOptions({
      rateLimit: { timeMs: defaultRateLimit.timeMs, mode: 'throttle' },
    });

    expect(result.rateLimit).toBe(defaultRateLimit);
  });

  it('should infer integer parser from defaultValue number', () => {
    const options = normalizeOptions(undefined, 5);
    expect(options.parse('10')).toBe(10);
    expect(options.serialize(42)).toBe('42');
  });

  it('should infer string parser from defaultValue string', () => {
    const options = normalizeOptions(undefined, 'foo');
    expect(options.parse('bar')).toBe('bar');
    expect(options.serialize('baz')).toBe('baz');
  });

  it('should infer boolean parser from defaultValue boolean', () => {
    const options = normalizeOptions(undefined, true);
    expect(options.parse('false')).toBe(false);
    expect(options.serialize(true)).toBe('true');
  });

  it('should infer array parser from defaultValue array', () => {
    const options = normalizeOptions(undefined, [1, 2, 3]);
    expect(options.parse('4,5')).toEqual([4, 5]);
    expect(options.serialize([6, 7])).toBe('6,7');
  });

  it('should infer json parser from defaultValue object', () => {
    const options = normalizeOptions(undefined, { id: 1 });
    expect(options.parse('{"id":2}')).toEqual({ id: 2 });
    expect(options.serialize({ id: 3 })).toBe('{"id":3}');
  });

  it('should merge user-provided options', () => {
    const custom = { history: 'push', scroll: true } as any;
    const result = normalizeOptions(custom, 1);
    expect(result.history).toBe('push');
    expect(result.scroll).toBe(true);
  });

  it('should fallback to defaults when no options and no defaultValue', () => {
    const result = normalizeOptions();
    expect(result.history).toBe('replace');
    expect(result.rateLimit).toBe(defaultRateLimit);
  });
});

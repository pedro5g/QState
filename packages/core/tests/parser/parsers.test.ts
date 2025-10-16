import { describe, it, expect } from 'vitest';
import {
  qsParserBoolean,
  qsParserString,
  qsParserInteger,
  qsParserFloat,
  qsParserTimestamp,
  qsParserDateTime,
  qsParserISODate,
  qsParserStringLiteral,
  qsParserNumberLiteral,
  qsParserJson,
  qsParserArray,
} from '../../src/parser/parsers';

describe('parsers: boolean', () => {
  it('should parse "true" as true and others as false', () => {
    expect(qsParserBoolean.parse('true')).toBe(true);
    expect(qsParserBoolean.parse('false')).toBe(false);
    expect(qsParserBoolean.parse('anything')).toBe(false);
  });

  it('should serialize boolean values correctly', () => {
    expect(qsParserBoolean.serialize(true)).toBe('true');
    expect(qsParserBoolean.serialize(false)).toBe('false');
  });
});

describe('parsers: string', () => {
  it('should parse string or null', () => {
    expect(qsParserString.parse('hello')).toBe('hello');
    expect(qsParserString.parse(null as any)).toBeNull();
  });

  it('should serialize to string', () => {
    expect(qsParserString.serialize('world')).toBe('world');
  });
});

describe('parsers: integer', () => {
  it('should parse integer strings correctly', () => {
    expect(qsParserInteger.parse('123')).toBe(123);
    expect(qsParserInteger.parse('abc')).toBeNull();
    expect(qsParserInteger.parse('12.5')).toBe(12);
  });

  it('should serialize numbers as rounded strings', () => {
    expect(qsParserInteger.serialize(4.9)).toBe('5');
    expect(qsParserInteger.serialize(10)).toBe('10');
  });
});

describe('parsers: float', () => {
  it('should parse valid float strings', () => {
    expect(qsParserFloat.parse('1.23')).toBeCloseTo(1.23);
    expect(qsParserFloat.parse('abc')).toBeNull();
  });

  it('should serialize numbers to string', () => {
    expect(qsParserFloat.serialize(3.14)).toBe('3.14');
  });
});

describe('parsers: timestamp', () => {
  it('should parse valid timestamps to Date', () => {
    const now = Date.now();
    const parsed = qsParserTimestamp.parse(now.toString());
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed!.getTime()).toBe(now);
  });

  it('should serialize Date to timestamp string', () => {
    const date = new Date(1700000000000);
    expect(qsParserTimestamp.serialize(date)).toBe('1700000000000');
  });

  it('should compare dates correctly', () => {
    const a = new Date(1700000000000);
    const b = new Date(1700000000000);
    const c = new Date(1700000001000);
    expect(qsParserTimestamp.equals(a, b)).toBe(true);
    expect(qsParserTimestamp.equals(a, c)).toBe(false);
  });
});

describe('parsers: datetime', () => {
  it('should parse ISO datetime strings', () => {
    const iso = new Date().toISOString();
    const parsed = qsParserDateTime.parse(iso);
    expect(parsed).toBeInstanceOf(Date);
  });

  it('should return null for invalid dates', () => {
    expect(qsParserDateTime.parse('invalid-date')).toBeNull();
  });

  it('should serialize date to ISO string', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    expect(qsParserDateTime.serialize(date)).toBe(date.toISOString());
  });
});

describe('parsers: ISO date', () => {
  it('should parse YYYY-MM-DD format to Date', () => {
    const parsed = qsParserISODate.parse('2024-10-10');
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed!.getUTCFullYear()).toBe(2024);
    expect(parsed!.getUTCMonth()).toBe(9);
  });

  it('should serialize Date to YYYY-MM-DD', () => {
    const date = new Date('2024-10-10T00:00:00Z');
    expect(qsParserISODate.serialize(date)).toBe('2024-10-10');
  });
});

describe('parsers: string literal', () => {
  const parser = qsParserStringLiteral(['A', 'B', 'C'] as const);

  it('should parse only allowed literals', () => {
    expect(parser.parse('A')).toBe('A');
    expect(parser.parse('Z')).toBeNull();
  });

  it('should serialize literals directly', () => {
    expect(parser.serialize('B')).toBe('B');
  });
});

describe('parsers: number literal', () => {
  const parser = qsParserNumberLiteral([1, 2, 3] as const);

  it('should parse only allowed numbers', () => {
    expect(parser.parse('2')).toBe(2);
    expect(parser.parse('4')).toBeNull();
  });

  it('should serialize numbers to string', () => {
    expect(parser.serialize(3)).toBe('3');
  });
});

describe('parsers: JSON', () => {
  it('should parse valid JSON strings', () => {
    const parser = qsParserJson<{ a: number }>();
    expect(parser.parse('{"a":1}')).toEqual({ a: 1 });
  });

  it('should return null for invalid JSON', () => {
    const parser = qsParserJson();
    expect(parser.parse('{invalid')).toBeNull();
  });

  it('should respect validator function', () => {
    const parser = qsParserJson<{ a: number }>(
      (val): val is { a: number } =>
        typeof val === 'object' && 'a' in (val as any)
    );
    expect(parser.parse('{"a":1}')).toEqual({ a: 1 });
    expect(parser.parse('"not-object"')).toBeNull();
  });

  it('should serialize objects to JSON', () => {
    const parser = qsParserJson<{ a: number }>();
    expect(parser.serialize({ a: 1 })).toBe('{"a":1}');
  });

  it('should compare JSON values deeply', () => {
    const parser = qsParserJson<{ a: number }>();
    expect(parser.equals({ a: 1 }, { a: 1 })).toBe(true);
    expect(parser.equals({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe('parsers: array', () => {
  const itemParser = qsParserInteger;
  const parser = qsParserArray(itemParser, ',');

  it('should parse separated values into an array', () => {
    expect(parser.parse('1,2,3')).toEqual([1, 2, 3]);
  });

  it('should filter out invalid items', () => {
    expect(parser.parse('1,abc,2')).toEqual([1, 2]);
  });

  it('should serialize arrays back to string', () => {
    expect(parser.serialize([1, 2, 3])).toBe('1,2,3');
  });

  it('should handle empty arrays', () => {
    expect(parser.serialize([])).toBe('');
    expect(parser.parse('')).toEqual([]);
  });

  it('should compare arrays deeply', () => {
    expect(parser.equals([1, 2], [1, 2])).toBe(true);
    expect(parser.equals([1, 2], [2, 1])).toBe(false);
  });
});

import type { ParserConfig, Require } from '../types';
import { createParser } from './create-parser-builder';

export const qsParserBoolean = createParser<boolean>({
  parse: (qs) => {
    return qs === 'true';
  },
  serialize: (qs) => (qs ? 'true' : 'false'),
});

export const qsParserString = createParser<string>({
  parse: (qs) => qs ?? null,
  serialize: (qs) => String(qs),
});

export const qsParserInteger = createParser<number>({
  parse: (qs) => {
    const int = parseInt(qs, 10);
    return Number.isInteger(int) ? int : null;
  },
  serialize: (qs) => Math.round(qs).toString(),
});

export const qsParserFloat = createParser<number>({
  parse: (qs) => {
    const float = parseFloat(qs);
    return Number.isFinite(float) ? float : null;
  },
  serialize: (qs) => qs.toString(),
});

function compareDates(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

export const qsParserTimestamp = createParser<Date>({
  parse: (qs) => {
    const ms = parseInt(qs, 10);
    return Number.isInteger(ms) ? new Date(ms) : null;
  },
  serialize: (qs) => qs.getTime().toString(),
  equals: compareDates,
});

export const qsParserDateTime = createParser<Date>({
  parse: (qs) => {
    const date = new Date(qs);
    return Number.isFinite(date.getTime()) ? date : null;
  },
  serialize: (qs) => qs.toISOString(),
  equals: compareDates,
});

export const qsParserISODate = createParser<Date>({
  parse: (qs) => {
    const date = new Date(qs + 'T00:00:00.000Z');
    return Number.isFinite(date.getTime()) ? date : null;
  },
  serialize: (qs) => qs.toISOString().split('T')[0]!,
  equals: compareDates,
});

export const qsParserStringLiteral = <const Literal extends string>(
  literals: readonly Literal[]
) => {
  return createParser<Literal>({
    parse: (qs): Literal | null => {
      return literals.includes(qs as Literal) ? (qs as Literal) : null;
    },
    serialize: (qs) => qs,
  });
};

export const qsParserNumberLiteral = <const Literal extends number>(
  literals: readonly Literal[]
) => {
  return createParser<Literal>({
    parse: (qs): Literal | null => {
      const num = parseFloat(qs) as Literal;
      return literals.includes(num) ? num : null;
    },
    serialize: (qs) => qs.toString(),
  });
};

export const qsParserJson = <T>(validator?: (value: unknown) => value is T) => {
  return createParser<T>({
    parse: (qs): T | null => {
      try {
        const parsed = JSON.parse(qs);
        if (validator) {
          return validator(parsed) ? parsed : null;
        }
        return parsed as T;
      } catch {
        return null;
      }
    },
    serialize: (qs) => JSON.stringify(qs),
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
};

export const qsParserArray = <T>(
  itemParser: Require<ParserConfig<T>, 'parse' | 'serialize'>,
  separator: string = ','
) => {
  const encodedSeparator = encodeURIComponent(separator);

  return createParser<T[]>({
    parse: (qs): T[] | null => {
      if (qs === null || qs === '') return [];

      return qs
        .split(separator)
        .map((item) => {
          const decoded = item.replaceAll(encodedSeparator, separator);
          return itemParser.parse(decoded);
        })
        .filter((item): item is T => item !== null);
    },
    serialize: (items) => {
      if (items.length === 0) return '';

      return items
        .map((item) => {
          const serialized = itemParser.serialize
            ? itemParser.serialize(item)
            : String(item);
          return serialized?.replaceAll(separator, encodedSeparator);
        })
        .filter((item): item is string => item !== null)
        .join(separator);
    },
    equals: (a, b) => {
      if (a.length !== b.length) return false;
      const itemEquals = itemParser.equals ?? Object.is;
      return a.every((item, index) => itemEquals(item, b[index]!));
    },
  });
};

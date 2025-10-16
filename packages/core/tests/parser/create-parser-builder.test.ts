import { createParser } from '../../src/parser';

describe('createParser', () => {
  const config = {
    parse: (v: string) => Number(v),
    serialize: (v: number) => v.toString(),
  };

  it('should return an object with default properties', () => {
    const parser = createParser(config);

    expect(parser).toHaveProperty('parse');
    expect(parser).toHaveProperty('serialize');
    expect(parser).toHaveProperty('equals');
    expect(parser).toHaveProperty('setDefault');
    expect(parser).toHaveProperty('defineOptions');
    expect(parser.equals).toBe(Object.is);
    expect(parser.defaultValue).toBeUndefined();
  });

  it('should merge the provided config into the returned parser', () => {
    const parser = createParser(config);
    expect(parser.parse('1')).toBe(1);
    expect(parser.serialize(2)).toBe('2');
  });

  it('setDefault should return a new object with the defaultValue set', () => {
    const parser = createParser(config);
    const newParser = parser.setDefault(10);

    expect(newParser).not.toBe(parser);
    expect(newParser.defaultValue).toBe(10);
    expect(parser.defaultValue).toBeUndefined();
  });

  it('defineOptions should merge options into the parser', () => {
    const parser = createParser(config);
    const newParser = parser.defineOptions({
      history: 'push',
      shallow: true,
    });

    expect(newParser.history).toBe('push');
    expect(newParser.shallow).toBe(true);
    expect(newParser.parse).toBe(parser.parse);
    expect(newParser.serialize).toBe(parser.serialize);
  });

  it('defineOptions and setDefault should be chainable', () => {
    const parser = createParser(config)
      .defineOptions({ shallow: true })
      .setDefault(42);

    expect(parser.defaultValue).toBe(42);
    expect(parser.shallow).toBe(true);
  });

  it('should allow overriding equals function', () => {
    const parser = createParser({
      ...config,
      equals: (a, b) => a == b,
    });

    expect(parser.equals(1, '1' as any)).toBe(true);
  });
});

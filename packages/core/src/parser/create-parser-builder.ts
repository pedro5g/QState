import type { CreateParserBuilder, ParserConfig, Require } from '../types';
// i based my implementation in:
// @reference https://github.com/47ng/nuqs/blob/next/packages/nuqs/src/parsers.ts#L7

// type inspiration - totality based in type narrowing and type branding
// @reference https://github.com/colinhacks/zod/blob/main/packages/zod/src/v3/helpers/util.ts#L80

export function createParser<T>(
  config: Require<ParserConfig<T>, 'parse' | 'serialize'>
): CreateParserBuilder<T> {
  return {
    defaultValue: undefined,
    equals: Object.is,
    ...config,
    setDefault(defaultValue) {
      return {
        ...this,
        defaultValue,
      };
    },
    defineOptions(options) {
      return {
        ...this,
        ...options,
      };
    },
  };
}

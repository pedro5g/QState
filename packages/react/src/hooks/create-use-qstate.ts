'use client';

import React from 'react';
import { resolveArgs } from '../utils';
import { useQStateCore } from './use-qstate-core';
import { type HistoryAdapter, type Optional } from '@qstate/core';
import type {
  ParsedFromParser,
  QueryStateConfig,
  QueryStateSetters,
  QueryStateValues,
  UseQueryStateOptions,
  UseQueryStateOptionsObject,
  UseQueryStateReturn,
} from '../types';

/**
 * Hook for managing URL query parameters as React state.
 *
 * Synchronizes query parameters with React state, providing a seamless
 * experience similar to `useState` but persisted in the URL.
 *
 * @remarks
 * The hook supports multiple usage patterns:
 * - Single parameter without default (returns `string | null`)
 * - Single parameter with default value (returns typed value)
 * - Single parameter with parser config
 * - Multiple parameters with object config
 *
 * @example
 * **Basic usage - No default (string | null)**
 * ```tsx
 * const [search, setSearch] = useQState('search');
 * // search: string | null
 * // URL: ?search=hello → search = 'hello'
 * // URL: / → search = null
 * ```
 *
 * @example
 * **With default value (typed)**
 * ```tsx
 * const [search, setSearch] = useQState('search', '');
 * // search: string (never null)
 * // URL: ?search=hello → search = 'hello'
 * // URL: / → search = ''
 *
 * const [page, setPage] = useQState('page', 1);
 * // page: number
 * // URL: ?page=5 → page = 5
 * // URL: / → page = 1
 * ```
 *
 * @example
 * **With options**
 * ```tsx
 * const [search, setSearch] = useQState('search', '', {
 *   history: 'push',      // Use push instead of replace
 *   shallow: false,       // Trigger re-render
 *   scroll: true,         // Scroll to top on change
 *   encode: true          // Encode special characters
 * });
 * ```
 *
 * @example
 * **With parser**
 * ```tsx
 * import { qsParserString } from '@qstate/core';
 *
 * // Without default
 * const [search, setSearch] = useQState('search', qsParserString);
 * // search: string | null
 *
 * // With default
 * const [search, setSearch] = useQState(
 *   'search',
 *   qsParserString.setDefault('hello-')
 * );
 * // search: string (never null, defaults to 'hello-')
 * ```
 *
 * @example
 * **Multiple parameters**
 * ```tsx
 * import { qsParserStringLiteral } from '@qstate/core';
 *
 * const [values, setValues] = useQState({
 *   page: 1,
 *   status: qsParserStringLiteral(['active', 'disabled']).setDefault('active'),
 *   profile: {
 *     name: 'pedro',
 *     age: 22
 *   }
 * });
 *
 * // Type: {
 * //   page: number,
 * //   status: 'active' | 'disabled',
 * //   profile: { name: string, age: number }
 * // }
 *
 * // Update individual values
 * setValues.page(2);
 * setValues.status('disabled');
 * setValues.profile({ name: 'john', age: 30 });
 * ```
 *
 * @example
 * **Setter function usage**
 * ```tsx
 * const [value, setValue] = useQState(
 *   'search',
 *   qsParserString.setDefault('hello-')
 * );
 *
 * // Direct value
 * setValue('goodbye');
 * // → value = 'goodbye'
 * // → URL: ?search=goodbye
 *
 * // Reset to default
 * setValue(null);
 * // → value = 'hello-'
 * // → URL: / (removed from URL)
 *
 * // Functional update
 * setValue((prev) => prev + 'world');
 * // → value = 'hello-world'
 * // → URL: ?search=hello-world
 *
 * // Functional reset
 * setValue(() => null);
 * // → value = 'hello-'
 * // → URL: / (removed from URL)
 * ```
 *
 * @example
 * **Advanced: Custom parser**
 * ```tsx
 * const [user, setUser] = useQState('user', {
 *   defaultValue: { id: 0, name: 'Guest' },
 *   parse: (str) => JSON.parse(str),
 *   serialize: (obj) => JSON.stringify(obj),
 *   equals: (a, b) => a.id === b.id
 * });
 *
 * setUser({ id: 1, name: 'John' });
 * // → URL: ?user=%7B%22id%22%3A1%2C%22name%22%3A%22John%22%7D
 * ```
 *
 * @template T - The type of the state value
 * @template Cfg - Configuration object type for multiple values
 * @template P - Parser configuration type
 
 */
export interface UseQState {
  /**
   * Manages multiple query parameters at once.
   *
   * Returns an object of values and an object of setter functions.
   * Each property can be a primitive value (used as default) or a parser config.
   *
   * @param config - Object mapping parameter names to default values or parser configs
   * @returns Tuple of [values object, setters object]
   *
   * @example
   * ```tsx
   * const [{ page, status }, { page: setPage, status: setStatus }] = useQState({
   *   page: 1,                    // Primitive: number with default 1
   *   status: {                   // Parser config
   *     defaultValue: 'active',
   *     parse: (v) => v as 'active' | 'disabled',
   *     serialize: (v) => v
   *   }
   * });
   *
   * // Update
   * setPage(2);           // ?page=2
   * setStatus('disabled'); // ?page=2&status=disabled
   * ```
   */
  <
    T extends Record<string, any>,
    Cfg extends QueryStateConfig<T> = QueryStateConfig<T>,
  >(
    config: Cfg
  ): [QueryStateValues<Cfg>, QueryStateSetters<Cfg>];

  /**
   * Manages a single query parameter with a parser configuration.
   *
   * The parser can have a default value (using `.setDefault()`) or return `null`
   * when the parameter is missing from the URL.
   *
   * @param key - Query parameter name
   * @param parser - Parser with optional default value
   * @returns Tuple of [value, setter function]
   *
   * @example
   * ```tsx
   * import { qsParserString, qsParserNumber } from '@qstate/core';
   *
   * // Without default → type: string | null
   * const [search, setSearch] = useQState('search', qsParserString);
   *
   * // With default → type: string
   * const [search, setSearch] = useQState(
   *   'search',
   *   qsParserString.setDefault('hello-')
   * );
   *
   * // Literal types
   * const [status, setStatus] = useQState(
   *   'status',
   *   qsParserStringLiteral(['active', 'disabled']).setDefault('active')
   * );
   * // type: 'active' | 'disabled'
   * ```
   */
  <P extends Optional<UseQueryStateOptionsObject<any>, 'defaultValue'>>(
    key: string,
    parser: P
  ): UseQueryStateReturn<ParsedFromParser<P>, P['defaultValue']>;

  /**
   * Manages a single query parameter with a default value and optional configuration.
   *
   * The type is inferred from the default value. The parameter is never `null` because
   * a default value is provided.
   *
   * @param key - Query parameter name
   * @param defaultValue - Value when parameter is not in URL (never null)
   * @param options - Optional configuration (history mode, encoding, etc.)
   * @returns Tuple of [value, setter function]
   *
   * @example
   * ```tsx
   * // String
   * const [search, setSearch] = useQState('search', '');
   * // type: string
   *
   * // Number
   * const [page, setPage] = useQState('page', 1);
   * // type: number
   *
   * // With options
   * const [page, setPage] = useQState('page', 1, {
   *   history: 'push',
   *   shallow: false
   * });
   * ```
   *
   * @remarks
   * **Setter behavior:**
   * ```tsx
   * setValue('new-value');           // Direct update
   * setValue(null);                  // Reset to defaultValue
   * setValue((prev) => prev + '!');  // Functional update
   * setValue(() => null);            // Functional reset to defaultValue
   * ```
   */
  <T = string>(
    key: string,
    defaultValue: T,
    options?: UseQueryStateOptions<T>
  ): UseQueryStateReturn<T, T>;

  /**
   * Manages a single query parameter without a default value.
   *
   * Returns `null` when the parameter is not present in the URL.
   * Inferred as `string | null` by default.
   *
   * @param key - Query parameter name
   * @returns Tuple of [value (string | null), setter function]
   *
   * @example
   * ```tsx
   * const [search, setSearch] = useQState('search');
   * // type: string | null
   *
   * // URL: ?search=hello → search = 'hello'
   * // URL: /              → search = null
   *
   * setSearch('world');  // ?search=world
   * setSearch(null);     // / (removed from URL)
   * ```
   */
  <T = string>(key: string): UseQueryStateReturn<T, undefined>;
}

/**
 * Creates a configured `useQState` hook with a custom history adapter.
 *
 * This factory function allows you to integrate with different routing solutions
 * (Next.js, React Router, etc.) by providing a custom adapter that handles
 * URL updates.
 *
 * @param historyAdapter - Adapter that manages URL state changes
 * @returns Configured useQState hook ready to use
 *
 * @example
 * **Browser (default)**
 * ```tsx
 * import { BrowserHistoryAdapter } from '@qstate/core';
 *
 * export const useQState = createUseQueryState(
 *   new BrowserHistoryAdapter()
 * );
 *
 * function Component() {
 *   const [page, setPage] = useQState('page', 1);
 *   return <div>Page: {page}</div>;
 * }
 * ```
 *
 * @example
 * **Next.js App Router**
 * ```tsx
 * import { NextHistoryAdapter } from '@qstate/next';
 *
 * export const useQState = createUseQueryState(
 *   new NextHistoryAdapter()
 * );
 * ```
 *
 * @example
 * **React Router**
 * ```tsx
 * import { ReactRouterAdapter } from '@qstate/react-router';
 *
 * export const useQState = createUseQueryState(
 *   new ReactRouterAdapter()
 * );
 * ```
 *
 * @example
 * **Custom Adapter**
 * ```tsx
 * const customAdapter: HistoryAdapter = {
 *   push: (url) => {
 *     // Your custom push logic
 *     console.log('Pushing:', url);
 *   },
 *   replace: (url) => {
 *     // Your custom replace logic
 *     console.log('Replacing:', url);
 *   }
 * };
 *
 * export const useQState = createUseQueryState(customAdapter);
 * ```
 */

export const createUseQState = (historyAdapter: HistoryAdapter): UseQState => {
  const useQState = ((...args: any[]) => {
    const result = resolveArgs(args as unknown as IArguments);

    if (result.isObject) {
      const entries = React.useMemo(
        () => [...result],
        [JSON.stringify(Object.keys(args[0] || {}))]
      );

      const results: Record<string, any> = {};
      const setters: Record<string, any> = {};

      for (const { key, defaultValue, config } of entries) {
        const [value, setter] = useQStateCore(
          key,
          defaultValue,
          config,
          historyAdapter
        );
        results[key] = value;
        setters[key] = setter;
      }

      return [results, setters];
    }

    const { key, defaultValue, config } = result;
    return useQStateCore(key, defaultValue, config, historyAdapter);
  }) as UseQState;

  return useQState;
};

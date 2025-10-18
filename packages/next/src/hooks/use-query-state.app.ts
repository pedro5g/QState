'use client';
import React from 'react';
import { type UseQState } from '@qstate/react';
import { useRouter, usePathname } from 'next/navigation.js';
import { resolveArgs } from '@qstate/react';
import { useQStateCore } from '@qstate/react';
import type { HistoryAdapter } from '@qstate/core';

export const useQState: UseQState = ((...args: any[]) => {
  const router = useRouter();
  const pathname = usePathname();

  const result = resolveArgs(args as unknown as IArguments);

  const nextHistoryAdapter: HistoryAdapter = React.useMemo(
    () => ({
      push(url, options) {
        router.push(url, { scroll: options?.scroll ?? false });
      },
      replace(url, options) {
        router.replace(url, { scroll: options?.scroll ?? false });
      },
      getPathname() {
        return pathname;
      },
    }),
    [router, pathname]
  );

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
        nextHistoryAdapter
      );
      results[key] = value;
      setters[key] = setter;
    }

    return [results, setters];
  }

  const { key, defaultValue, config } = result;
  return useQStateCore(key, defaultValue, config, nextHistoryAdapter);
}) as UseQState;

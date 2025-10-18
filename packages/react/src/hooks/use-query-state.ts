'use client';

import { BrowserHistoryAdapter } from '@qstate/core';
import { createUseQueryState } from './create-use-query-state';

export const useQueryState = createUseQueryState(new BrowserHistoryAdapter());

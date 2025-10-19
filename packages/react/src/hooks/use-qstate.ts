'use client';

import { BrowserHistoryAdapter } from '@query-state/core';
import { createUseQState } from './create-use-qstate';

export const useQState = createUseQState(new BrowserHistoryAdapter());

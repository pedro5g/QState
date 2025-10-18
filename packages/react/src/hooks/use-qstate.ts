'use client';

import { BrowserHistoryAdapter } from '@qstate/core';
import { createUseQState } from './create-use-qstate';

export const useQState = createUseQState(new BrowserHistoryAdapter());

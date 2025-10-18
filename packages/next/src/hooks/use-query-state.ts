'use client';

import { createUseQueryState } from '@qstate/react';
import { NextHistoryAdapter } from '../adapters/next-history-adapter';

export const useQueryState = createUseQueryState(NextHistoryAdapter());

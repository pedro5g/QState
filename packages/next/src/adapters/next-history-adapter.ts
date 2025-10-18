'use client';

import { isPagesRouter } from '../utils';
import { NextAppRouterAdapter } from './next-app-router-adapter';
import { NextPagesRouterAdapter } from './next-pages-router-adapter';

export function NextHistoryAdapter() {
  return isPagesRouter()
    ? new NextPagesRouterAdapter()
    : new NextAppRouterAdapter();
}

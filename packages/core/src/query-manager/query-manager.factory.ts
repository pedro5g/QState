import { ImpHistoryPatch } from '../patch';
import { ImpQueryQueue } from '../queue';
import { ImpRateLimiter } from '../rate-limiter';
import { __QUERY_MANAGER__, isClientSide } from '../utils';
import { ImpQueryManager } from './imp-query-manager';

export function createQueryManager() {
  if (!isClientSide()) {
    return null as unknown as ImpQueryManager;
  }

  if (!window[__QUERY_MANAGER__]) {
    const historyPatch = new ImpHistoryPatch();
    const rateLimiter = new ImpRateLimiter();
    const queryQueue = new ImpQueryQueue();

    window[__QUERY_MANAGER__] = new ImpQueryManager(
      historyPatch,
      rateLimiter,
      queryQueue
    );
  }

  return window[__QUERY_MANAGER__];
}

export const queryManager = createQueryManager();

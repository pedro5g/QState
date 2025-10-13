import type { QueryQueue, QueueIntention } from '../types';
import { ImpQueue } from './imp-queue';

export class ImpQueryQueue
  extends ImpQueue<QueueIntention>
  implements QueryQueue
{
  process() {
    if (this.queue.length === 0) return;

    const url = new URL(window.location.href);

    for (const { key, value } of this.queue) {
      if (value === null) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    }

    const last = this.queue[this.queue.length - 1];
    const { method, options } = last!;

    const {
      shallow = false,
      scroll = false,
      pathname,
      history: historyAdapter,
    } = options;

    if (!shallow && historyAdapter && pathname) {
      const queryString = url.searchParams.toString();
      const fullPath = `${pathname}${queryString ? '?' + queryString : ''}`;

      if (method === 'push') {
        historyAdapter.push(fullPath, { scroll });
      } else {
        historyAdapter.replace(fullPath, { scroll });
      }
    } else {
      if (method === 'push') {
        window.history.pushState({}, '', url.toString());
      } else {
        window.history.replaceState({}, '', url.toString());
      }
      if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    this.queue = [];
  }
}

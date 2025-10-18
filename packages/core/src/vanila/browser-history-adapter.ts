import type { HistoryAdapter } from '../types';

export class BrowserHistoryAdapter implements HistoryAdapter {
  push(url: string, options?: { scroll?: boolean }) {
    window.history.pushState({}, '', url);
    if (options?.scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  replace(url: string, options?: { scroll?: boolean }) {
    window.history.replaceState({}, '', url);
    if (options?.scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPathname(): string {
    return window.location.pathname;
  }
}

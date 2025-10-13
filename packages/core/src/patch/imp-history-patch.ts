import type { HistoryMode, QSChangeEvent, HistoryPatch } from '../types';
import { QS_EVENT, timeout } from '../utils';

/**
 * Intercept and modify original history object
 * Change default behavior of pushState and replaceState methods
 *
 * This ensures consistency across the entire application, because all APIs
 * using these methods will have the modified behavior.
 *
 * To ensure total control over search params and cover most cases,
 * it's necessary to intercept the methods that manipulate the URL.
 * We use "Monkey patching" for this.
 *
 * @reference https://jscrambler.com/blog/an-analysis-of-code-poisoning-monkey-patching-javascript
 *
 * Next abuses it - from a look at
 * node_modules/.pnpm/next@15.4.5_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/client/components/app-router.js [line - 309]
 * node_modules/.pnpm/next@15.4.5_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/lib/patch-fetch.js [line - 706]
 *
 */
export class ImpHistoryPatch implements HistoryPatch {
  private originalPushState: typeof window.history.pushState;
  private originalReplaceState: typeof window.history.replaceState;
  private abortController: AbortController;
  private isPatched;
  private subscribers = new Set<() => void>();

  constructor() {
    this.originalPushState = window.history.pushState.bind(window.history);
    this.originalReplaceState = window.history.replaceState.bind(
      window.history
    );
    this.abortController = new AbortController();
    this.isPatched = false;
  }

  private handlerUrlChange(
    oldUrl: string,
    newUrl: string,
    method: HistoryMode
  ) {
    if (new URL(oldUrl).href === new URL(newUrl).href) return;

    const oldParams = new URLSearchParams(new URL(oldUrl).search);
    const newParams = new URLSearchParams(new URL(newUrl).search);

    const changedKeys = new Set<string>();

    const allKeys = new Set([
      ...Array.from(oldParams.keys()),
      ...Array.from(newParams.keys()),
    ]);

    for (const key of allKeys) {
      const oldValue = oldParams.get(key);
      const newValue = newParams.get(key);
      if (oldValue !== newValue) {
        changedKeys.add(key);
      }
    }

    if (changedKeys.size > 0) {
      // Schedule the event dispatch to avoid synchronous updates during render
      timeout(
        () => {
          window.dispatchEvent(
            new CustomEvent<QSChangeEvent>(QS_EVENT, {
              detail: {
                keys: Array.from(changedKeys),
                method,
                oldUrl,
                newUrl,
              },
            })
          );
        },
        0,
        this.abortController.signal
      );
    }

    // Schedule subscriber notifications asynchronously
    timeout(
      () => {
        this.subscribers.forEach((callback) => callback());
      },
      0,
      this.abortController.signal
    );
  }

  subscribe(callback: () => void) {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  safePushState<T = any>(data: T, unused: string, url?: string | URL | null) {
    this.originalPushState(data, unused, url);
  }

  safeReplaceState<T = any>(
    data: T,
    unused: string,
    url?: string | URL | null
  ) {
    this.originalReplaceState(data, unused, url);
  }

  patch() {
    if (this.isPatched) return;
    window.history.pushState = (data, unused, url) => {
      const oldUrl = window.location.href;
      this.originalPushState(data, unused, url);
      this.handlerUrlChange(oldUrl, window.location.href, 'push');
    };

    window.history.replaceState = (data, unused, url) => {
      const oldUrl = window.location.href;
      this.originalReplaceState(data, unused, url);
      this.handlerUrlChange(oldUrl, window.location.href, 'replace');
    };

    this.isPatched = true;
  }

  unpatch() {
    if (!this.isPatched) return;

    window.history.pushState = this.originalPushState;
    window.history.replaceState = this.originalReplaceState;

    this.subscribers.clear();

    this.abortController.abort();
    this.isPatched = false;
  }
}

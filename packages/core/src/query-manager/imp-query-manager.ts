import type {
  HistoryMode,
  HistoryPatch,
  Options,
  QSChangeEvent,
  QueryQueue,
  QueryManager,
  RateLimitConfig,
  RateLimiter,
} from '../types';
import { defaultRateLimit, QS_EVENT, timeout } from '../utils';

/**
 * Centralize all query state control
 *
 * set one unique qsEvent listening to application
 */
export class ImpQueryManager implements QueryManager {
  private subscribers = new Map<string, Set<() => void>>();
  private abortController: AbortController;

  private isInitialized = false;

  constructor(
    private readonly historyPatch: HistoryPatch,
    private readonly rateLimiter: RateLimiter,
    private readonly queryQueue: QueryQueue
  ) {
    this.abortController = new AbortController();
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    this.historyPatch.patch();

    window.addEventListener('popstate', this.handlerQSChange.bind(this));
    window.addEventListener(QS_EVENT, this.handlerQSChange.bind(this));

    this.isInitialized = true;
  }

  private handlerQSChange(e?: Event) {
    // Schedule notifications asynchronously to avoid synchronous updates during render
    timeout(
      () => {
        if (this.nestingEvent(e)) {
          this.notifySubscribers(e.detail.keys);
        } else if (e?.type === 'popstate') {
          // For popstate (browser back/forward), notify all subscribers
          this.notifySubscribers(Array.from(this.subscribers.keys()));
        }
      },
      0,
      this.abortController.signal
    );
  }

  /**
   * Check and validate if event matches QSChangeEvent interface
   * @param e - Event
   * @returns boolean and narrows type to CustomEvent<QSChangeEvent>
   */
  private nestingEvent(e?: Event): e is CustomEvent<QSChangeEvent> {
    return (
      e instanceof CustomEvent &&
      'keys' in (e.detail || {}) &&
      Array.isArray(e.detail?.keys) &&
      e.detail.keys.length > 0
    );
  }

  private notifySubscribers(keys: string[]) {
    keys.forEach((key) => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.forEach((callback) => callback());
      }
    });
  }

  subscribe(key: string, callback: () => void) {
    this.init();

    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);

        if (callbacks.size === 0) {
          this.subscribers.delete(key);
          this.rateLimiter.clearKey(key);
        }
      }
    };
  }

  update(
    key: string,
    value: string | null,
    method: HistoryMode = 'replace',
    options: Options,
    rateLimitConfig: RateLimitConfig = defaultRateLimit
  ) {
    this.rateLimiter.execute(
      key,
      () => {
        this.queryQueue.enqueue({
          key,
          value,
          method,
          options,
        });
      },
      rateLimitConfig
    );
  }

  silentUpdate(
    key: string,
    value: string | null,
    method: HistoryMode = 'replace'
  ) {
    const url = new URL(window.location.href);

    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }

    if (method === 'push') {
      this.historyPatch.safePushState({}, '', url.toString());
    } else {
      this.historyPatch.safeReplaceState({}, '', url.toString());
    }
  }

  cleanup() {
    this.rateLimiter.cleanup();
    this.historyPatch.unpatch();
    this.subscribers.clear();
    this.isInitialized = false;
    this.abortController.abort();
    this.abortController = new AbortController();
  }
}

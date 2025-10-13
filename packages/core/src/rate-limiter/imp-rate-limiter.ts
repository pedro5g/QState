import type { PendingOperation, RateLimitConfig, RateLimiter } from '../types';
import { defaultRateLimit, timeout } from '../utils';

export class ImpRateLimiter implements RateLimiter {
  private lastExecution = new Map<string, number>();
  private pendingOperations = new Map<string, PendingOperation>();
  private abortControllers = new Map<string, AbortController>();

  execute(
    key: string,
    operation: () => void,
    config: RateLimitConfig = defaultRateLimit
  ) {
    const operationKey = this.createOperationKey(config.mode, key);

    if (config.mode === 'throttle') {
      this.handleThrottle(operationKey, operation, config.timeMs);
    } else if (config.mode === 'debounce') {
      this.handleDebounce(operationKey, operation, config.timeMs);
    }
  }

  private createOperationKey(mode: 'throttle' | 'debounce', key: string) {
    return `${mode}-${key}` as const;
  }

  private handleThrottle(key: string, operation: () => void, timeMs: number) {
    const now = Date.now();
    const lastExec = this.lastExecution.get(key) || 0;
    const timeSinceLastExec = now - lastExec;

    if (timeSinceLastExec >= timeMs) {
      // Execute immediately
      this.lastExecution.set(key, now);
      operation();

      this.abortControllers.get(key)?.abort();
      this.abortControllers.delete(key);
      this.pendingOperations.delete(key);
    } else {
      let operationController = this.abortControllers.get(key);

      if (operationController && !operationController.signal.aborted) {
        return;
      }

      operationController?.abort();
      operationController = new AbortController();
      this.abortControllers.set(key, operationController);

      const pendingOp: PendingOperation = {
        key,
        operation,
        timestamp: now,
        timeMs,
      };
      this.pendingOperations.set(key, pendingOp);

      const remainingTime = timeMs - timeSinceLastExec;
      timeout(
        () => {
          this.lastExecution.set(key, Date.now());
          operation();
          this.abortControllers.delete(key);
          this.pendingOperations.delete(key);
        },
        remainingTime,
        operationController!.signal
      );
    }
  }

  private handleDebounce(key: string, operation: () => void, timeMs: number) {
    let operationController = this.abortControllers.get(key);
    operationController?.abort();

    operationController = new AbortController();
    this.abortControllers.set(key, operationController);

    const pendingOp: PendingOperation = {
      key,
      operation,
      timestamp: Date.now(),
      timeMs,
    };
    this.pendingOperations.set(key, pendingOp);

    timeout(
      () => {
        operation();
        this.abortControllers.delete(key);
        this.pendingOperations.delete(key);
      },
      timeMs,
      operationController!.signal
    );
  }

  clearKey(key: string): void {
    const throttleKey = `throttle-${key}`;
    const debounceKey = `debounce-${key}`;

    [throttleKey, debounceKey].forEach((k) => {
      const controller = this.abortControllers.get(k);

      // preserves operations that have not yet been executed
      if (controller && !controller.signal.aborted) {
        const pendingOp = this.pendingOperations.get(k);
        const isStale = pendingOp
          ? Date.now() - pendingOp.timestamp > pendingOp.timeMs
          : true;

        if (isStale) {
          controller.abort();
        } else {
          return; // return within forEach works like instruction continue
        }
      }

      this.abortControllers.delete(k);
      this.pendingOperations.delete(k);
      this.lastExecution.delete(k);
    });
  }

  cleanup(): void {
    this.abortControllers.forEach((abortController) => {
      abortController.abort();
    });
    this.abortControllers.clear();
    this.lastExecution.clear();
    this.pendingOperations.clear();
  }
}

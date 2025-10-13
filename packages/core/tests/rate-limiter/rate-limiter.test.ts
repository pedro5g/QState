import type { RateLimitConfig } from '../../src/types';
import { ImpRateLimiter } from '../../src/rate-limiter';
import { timeout } from '../../src/utils';

vi.mock('../../src/utils', () => ({
  timeout: vi.fn((cb, ms, signal) => {
    const id = setTimeout(cb, ms);
    signal?.addEventListener('abort', () => clearTimeout(id));
  }),
  defaultRateLimit: { mode: 'throttle', timeMs: 100 },
}));

describe('ImpRateLimiter', () => {
  let sut: ImpRateLimiter;
  let spy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    sut = new ImpRateLimiter();
    spy = vi.fn();
  });

  describe('mode: throttle', () => {
    const throttleCfg: RateLimitConfig = { mode: 'throttle', timeMs: 100 };

    it('should execute immediately if no recent execution', () => {
      const spyHandleThrottle = vi.spyOn(sut as any, 'handleThrottle');
      const spyCreateOperationKey = vi.spyOn(sut as any, 'createOperationKey');
      sut.execute('key', spy, throttleCfg);
      expect(spy).toHaveBeenCalledOnce();
      expect(spyHandleThrottle).toHaveBeenCalledOnce();
      expect(spyCreateOperationKey).toHaveBeenCalledOnce();
      expect(spyCreateOperationKey).toReturnWith('throttle-key');
    });

    it('should skip execution if called again within cooldown', () => {
      sut.execute('key', spy, throttleCfg);
      sut.execute('key', spy, throttleCfg);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should schedule a pending operation if called within cooldown', () => {
      sut.execute('key', spy, throttleCfg);
      sut.execute('key', spy, throttleCfg);

      expect(timeout).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple independent keys separately', () => {
      sut.execute('a', spy, throttleCfg);
      sut.execute('b', spy, throttleCfg);
      vi.advanceTimersToNextTimer();
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('mode: debounce', () => {
    const debounceCfg: RateLimitConfig = { mode: 'debounce', timeMs: 100 };

    it('should delay execution until timeMs elapses', () => {
      const spyHandleDebounce = vi.spyOn(sut as any, 'handleDebounce');
      const spyCreateOperationKey = vi.spyOn(sut as any, 'createOperationKey');
      sut.execute('key', spy, debounceCfg);
      expect(spy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(spy).toHaveBeenCalledOnce();
      expect(spyHandleDebounce).toHaveBeenCalledOnce();
      expect(spyCreateOperationKey).toHaveBeenCalledOnce();
      expect(spyCreateOperationKey).toReturnWith('debounce-key');
    });

    it('should reset the timer on rapid consecutive calls', () => {
      sut.execute('key', spy, debounceCfg);
      vi.advanceTimersByTime(50);
      sut.execute('key', spy, debounceCfg);
      vi.advanceTimersByTime(99);

      expect(spy).not.toHaveBeenCalled();
      vi.advanceTimersToNextTimer();

      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('clearKey', () => {
    const cfg: RateLimitConfig = { mode: 'debounce', timeMs: 100 };

    it('should abort and remove pending operations for given key', () => {
      vi.setSystemTime(new Date(0));
      sut.execute('key', spy, cfg);
      vi.setSystemTime(new Date(200));
      sut.clearKey('key');

      vi.advanceTimersByTime(200);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not abort non-stale pending operations', () => {
      sut.execute('key', spy, cfg);
      vi.advanceTimersByTime(50);
      sut.clearKey('key');

      vi.advanceTimersByTime(100);
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('cleanup', () => {
    const cfg: RateLimitConfig = { mode: 'throttle', timeMs: 100 };

    it('should abort and clear all internal maps', () => {
      sut.execute('a', spy, cfg);
      sut.execute('b', spy, cfg);

      sut.cleanup();

      vi.advanceTimersByTime(200);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(sut['abortControllers'].size).toBe(0);
      expect(sut['lastExecution'].size).toBe(0);
      expect(sut['pendingOperations'].size).toBe(0);
    });
  });
});

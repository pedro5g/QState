import { ImpQueryManager } from '../../src/query-manager';
import { QS_EVENT, defaultRateLimit } from '../../src/utils';

describe('ImpQueryManager', () => {
  let historyPatchMock: any;
  let rateLimiterMock: any;
  let queryQueueMock: any;
  let sut: ImpQueryManager;

  beforeEach(() => {
    vi.useFakeTimers();

    historyPatchMock = {
      patch: vi.fn(),
      unpatch: vi.fn(),
      safePushState: vi.fn(),
      safeReplaceState: vi.fn(),
    };

    rateLimiterMock = {
      execute: vi.fn((_, fn) => fn()),
      clearKey: vi.fn(),
      cleanup: vi.fn(),
    };

    queryQueueMock = {
      enqueue: vi.fn(),
    };

    vi.stubGlobal('location', {
      href: 'https://example.com/?foo=1&keep=1',
      search: '?foo=1&keep=1',
    });

    sut = new ImpQueryManager(
      historyPatchMock,
      rateLimiterMock,
      queryQueueMock
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    sut.cleanup();
  });

  it('should initialize once and patch history', () => {
    sut.init();
    expect(sut['isInitialized']).toBe(true);
    expect(historyPatchMock.patch).toHaveBeenCalledTimes(1);

    sut.init();
    expect(sut['isInitialized']).toBe(true);
    expect(historyPatchMock.patch).toHaveBeenCalledTimes(1);
  });

  it('should subscribe and trigger callback on notify', () => {
    const callback = vi.fn();
    sut.subscribe('foo', callback);

    sut['notifySubscribers'](['foo']);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should remove callback when unsubscribed and clear rateLimiter key', () => {
    const callback = vi.fn();
    const unsubscribe = sut.subscribe('bar', callback);

    unsubscribe();

    expect(rateLimiterMock.clearKey).toHaveBeenCalledWith('bar');
    sut['notifySubscribers'](['bar']);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should trigger rateLimiter.execute and enqueue correct data on update', () => {
    const options = {};
    sut.update('foo', '123', 'replace', options, defaultRateLimit);

    expect(rateLimiterMock.execute).toHaveBeenCalledWith(
      'foo',
      expect.any(Function),
      defaultRateLimit
    );

    expect(queryQueueMock.enqueue).toHaveBeenCalledWith({
      key: 'foo',
      value: '123',
      method: 'replace',
      options,
    });
  });

  it('should call safeReplaceState on silentUpdate (replace)', () => {
    sut.silentUpdate('foo', '321', 'replace');

    expect(historyPatchMock.safeReplaceState).toHaveBeenCalledWith(
      {},
      '',
      expect.stringContaining('foo=321')
    );
  });

  it('should call safePushState on silentUpdate (push)', () => {
    sut.silentUpdate('bar', 'xyz', 'push');

    expect(historyPatchMock.safePushState).toHaveBeenCalledWith(
      {},
      '',
      expect.stringContaining('bar=xyz')
    );
  });

  it('should remove param on silentUpdate when value is null', () => {
    sut.silentUpdate('foo', null, 'replace');

    expect(historyPatchMock.safeReplaceState).toHaveBeenCalledWith(
      {},
      '',
      expect.not.stringContaining('foo=')
    );
  });

  it('should detect valid nestingEvent', () => {
    const event = new CustomEvent(QS_EVENT, { detail: { keys: ['foo'] } });
    expect(sut['nestingEvent'](event)).toBe(true);
  });

  it('should return false for invalid nestingEvent', () => {
    const event = new Event('random');
    expect(sut['nestingEvent'](event)).toBe(false);
  });

  it('should handle QS_EVENT and notify correct keys', async () => {
    const callback = vi.fn();
    sut.subscribe('foo', callback);

    const event = new CustomEvent(QS_EVENT, { detail: { keys: ['foo'] } });
    window.dispatchEvent(event);

    vi.runAllTimers();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle popstate event and notify all subscribers', async () => {
    const fooCb = vi.fn();
    const barCb = vi.fn();

    sut.subscribe('foo', fooCb);
    sut.subscribe('bar', barCb);

    window.dispatchEvent(new PopStateEvent('popstate'));

    vi.runAllTimers();
    expect(fooCb).toHaveBeenCalledOnce();
    expect(barCb).toHaveBeenCalledOnce();
  });

  it('should cleanup all internal state', () => {
    const sub = vi.fn();
    sut.subscribe('key', sub);

    sut.cleanup();

    expect(rateLimiterMock.cleanup).toHaveBeenCalled();
    expect(historyPatchMock.unpatch).toHaveBeenCalled();

    expect(sut['subscribers'].size).toBe(0);
    expect(sut['isInitialized']).toBe(false);
  });
});

import { ImpQueryQueue } from '../../src/queue';
import type { HistoryAdapter } from '../../src/types';

describe('QueryQueue', () => {
  let sut: ImpQueryQueue;
  let pushSpy: ReturnType<typeof vi.fn>;
  let replaceSpy: ReturnType<typeof vi.fn>;
  let scrollSpy: ReturnType<typeof vi.fn>;
  let historyAdapter: HistoryAdapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('scrollTo', vi.fn());
    scrollSpy = vi.fn();
    (window as any).scrollTo = scrollSpy;

    vi.stubGlobal('location', {
      href: 'https://example.com/test?foo=1&keep=1',
      search: '?foo=1&keep=1',
    });

    vi.stubGlobal('history', {
      pushState: vi.fn(),
      replaceState: vi.fn(),
    });

    pushSpy = vi.fn();
    replaceSpy = vi.fn();
    historyAdapter = {
      push: pushSpy,
      replace: replaceSpy,
    };

    sut = new ImpQueryQueue();
  });

  it('should do nothing if queue is empty', () => {
    sut.process();
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('should handle multiple query parameters being added, updated, and deleted in a single queue', () => {
    sut.enqueue({
      key: 'foo',
      value: '10',
      method: 'push',
      options: { historyAdapter, pathname: '/page' },
    });
    sut.enqueue({
      key: 'bar',
      value: '123',
      method: 'push',
      options: { historyAdapter, pathname: '/page' },
    });
    sut.enqueue({
      key: 'keep',
      value: null,
      method: 'push',
      options: { historyAdapter, pathname: '/page' },
    });
    sut.enqueue({
      key: 'foo',
      value: null,
      method: 'push',
      options: { historyAdapter, pathname: '/page' },
    });

    sut.process();

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect((pushSpy.mock.calls as any)[0][0]).toMatch(/^\/page\?/);
    const calledUrl = (pushSpy.mock.calls as any)[0][0];
    expect(calledUrl).toContain('bar=123');
    expect(calledUrl).not.toContain('foo=');
    expect(calledUrl).not.toContain('keep=');
  });

  it("should use replace when method === 'replace' and shallow = false", () => {
    sut.enqueue({
      key: 'bar',
      value: '42',
      method: 'replace',
      options: { historyAdapter, pathname: '/new', shallow: false },
    });

    sut.process();
    expect(replaceSpy).toHaveBeenCalledWith('/new?foo=1&keep=1&bar=42', {
      scroll: false,
    });
  });

  it('should use window.history when shallow === true (no historyAdapter call)', () => {
    sut.enqueue({
      key: 'baz',
      value: '99',
      method: 'push',
      options: { shallow: true },
    });

    sut.process();
    expect(window.history.pushState).toHaveBeenCalledWith(
      {},
      '',
      expect.stringContaining('baz=99')
    );
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("should use replaceState when shallow === true and method === 'replace'", () => {
    sut.enqueue({
      key: 'zeta',
      value: '777',
      method: 'replace',
      options: { shallow: true },
    });

    sut.process();
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      '',
      expect.stringContaining('zeta=777')
    );
  });

  it('should scroll to top if scroll option is true (even with shallow)', () => {
    sut.enqueue({
      key: 'x',
      value: 'y',
      method: 'push',
      options: { shallow: true, scroll: true },
    });

    sut.process();
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('should scroll to top when using historyAdapter and scroll=true', () => {
    sut.enqueue({
      key: 'scroll',
      value: 'true',
      method: 'push',
      options: { historyAdapter, pathname: '/scroll', scroll: true },
    });

    sut.process();
    expect(pushSpy).toHaveBeenCalledWith('/scroll?foo=1&keep=1&scroll=true', {
      scroll: true,
    });
  });

  it('should prioritize last queue entry when multiple entries exist for same key', () => {
    sut.enqueue({
      key: 'mode',
      value: 'draft',
      method: 'push',
      options: { historyAdapter, pathname: '/p' },
    });
    sut.enqueue({
      key: 'mode',
      value: 'final',
      method: 'push',
      options: { historyAdapter, pathname: '/p' },
    });

    sut.process();
    const calledUrl = (pushSpy.mock.calls as any)[0][0];
    expect(calledUrl).toContain('mode=final');
    expect(calledUrl).not.toContain('mode=draft');
  });

  it('should clear queue after processing', () => {
    sut.enqueue({
      key: 'bar',
      value: '22',
      method: 'push',
      options: { historyAdapter, pathname: '/some' },
    });

    sut.process();
    expect((sut as any).queue.length).toBe(0);
  });

  it('should not fail when pathname is missing but historyAdapter is present', () => {
    sut.enqueue({
      key: 'missing',
      value: 'path',
      method: 'push',
      options: { historyAdapter },
    });

    sut.process();

    expect(window.history.pushState).toHaveBeenCalled();
  });

  it('should preserve existing query params when using historyAdapter', () => {
    sut.enqueue({
      key: 'newKey',
      value: 'ok',
      method: 'push',
      options: { historyAdapter, pathname: '/same' },
    });

    sut.process();
    const calledUrl = (pushSpy.mock.calls as any)[0][0];
    expect(calledUrl).toContain('foo=1');
    expect(calledUrl).toContain('keep=1');
    expect(calledUrl).toContain('newKey=ok');
  });
});

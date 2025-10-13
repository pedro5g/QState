import type { MockInstance } from 'vitest';
import { ImpHistoryPatch } from '../../src/patch';

vi.mock('../utils', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    timeout: vi.fn((fn, _delay, _signal) => fn()),
  };
});

describe('HistoryPatch', () => {
  let sut: ImpHistoryPatch;
  let originalPushState: ReturnType<typeof vi.fn>;
  let originalReplaceState: ReturnType<typeof vi.fn>;
  let dispatchSpy: MockInstance<
    ((event: Event) => boolean) & ((event: Event) => boolean)
  >;
  let locationHref = 'http://example.com/?foo=1';

  beforeEach(() => {
    originalPushState = vi.fn();
    originalReplaceState = vi.fn();

    vi.stubGlobal('history', {
      pushState: originalPushState,
      replaceState: originalReplaceState,
    });

    Object.defineProperty(window, 'location', {
      get: () => ({ href: locationHref }),
      set: (val) => {
        locationHref = val;
      },
      configurable: true,
    });

    dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    vi.useFakeTimers();
    sut = new ImpHistoryPatch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    locationHref = 'http://example.com/?foo=1';
  });

  it('should patch pushState and replaceState only once', () => {
    sut.patch();
    const firstPush = window.history.pushState;
    sut.patch();
    const secondPush = window.history.pushState;

    expect(firstPush).toBe(secondPush);
  });

  it('should call original pushState and dispatch event on push', () => {
    sut.patch();

    const newUrl = 'http://example.com/?foo=2&bar=1';

    originalPushState.mockImplementation((_data, _unused, url) => {
      locationHref = url as string;
    });

    window.history.pushState({}, '', newUrl);

    vi.advanceTimersToNextTimer();

    expect(originalPushState).toHaveBeenCalledWith({}, '', newUrl);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '__qschange__',
        detail: expect.objectContaining({
          keys: expect.arrayContaining(['foo', 'bar']),
          method: 'push',
          oldUrl: 'http://example.com/?foo=1',
          newUrl,
        }),
      })
    );
  });

  it('should call original replaceState and dispatch event on replace', () => {
    sut.patch();

    const newUrl = 'http://example.com/?x=1';

    originalReplaceState.mockImplementation((_data, _unused, url) => {
      locationHref = url as string;
    });

    window.history.replaceState({}, '', newUrl);

    vi.advanceTimersToNextTimer();

    expect(originalReplaceState).toHaveBeenCalledWith({}, '', newUrl);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '__qschange__',
        detail: expect.objectContaining({
          keys: expect.arrayContaining(['foo', 'x']),
          method: 'replace',
          oldUrl: 'http://example.com/?foo=1',
          newUrl,
        }),
      })
    );
  });

  it('should not dispatch event if URL does not change', () => {
    sut.patch();

    const sameUrl = 'http://example.com/?foo=1';
    window.history.pushState({}, '', sameUrl);
    locationHref = sameUrl;

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should allow subscribing and unsubscribing from changes', () => {
    const callback = vi.fn();
    const unsubscribe = sut.subscribe(callback);

    sut['subscribers'].forEach((fn) => fn());
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    sut['subscribers'].forEach((fn) => fn());
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should safely call original pushState through safePushState', () => {
    sut.safePushState({}, '', '/safe');
    expect(originalPushState).toHaveBeenCalledWith({}, '', '/safe');
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should safely call original replaceState through safeReplaceState', () => {
    sut.safeReplaceState({}, '', '/safe-replace');
    expect(originalReplaceState).toHaveBeenCalledWith({}, '', '/safe-replace');
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should unpatch correctly and restore behavior', () => {
    sut.patch();

    window.history.pushState({}, '', 'http://example.com/?foo=2');
    locationHref = 'http://example.com/?foo=2';
    window.history.replaceState({}, '', 'http://example.com/?bar=1');
    locationHref = 'http://example.com/?bar=1';

    sut.unpatch();

    sut.safePushState({}, '', '/check');
    expect(originalPushState).toHaveBeenCalledWith({}, '', '/check');
    sut.safeReplaceState({}, '', '/check-replace');
    expect(originalReplaceState).toHaveBeenCalledWith({}, '', '/check-replace');

    expect(sut['subscribers'].size).toBe(0);

    expect(sut['abortController'].signal.aborted).toBe(true);
  });

  it('should not unpatch if not previously patched', () => {
    const abortSpy = vi.spyOn(sut['abortController'], 'abort');
    sut.unpatch();
    expect(abortSpy).not.toHaveBeenCalled();
  });
});

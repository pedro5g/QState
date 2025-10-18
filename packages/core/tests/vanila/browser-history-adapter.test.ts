import { BrowserHistoryAdapter } from '../../src/vanila';

describe('BrowserHistoryAdapter', () => {
  let sut: BrowserHistoryAdapter;

  beforeEach(() => {
    sut = new BrowserHistoryAdapter();

    vi.stubGlobal('history', {
      pushState: vi.fn(),
      replaceState: vi.fn(),
    });

    vi.stubGlobal('scrollTo', vi.fn());

    vi.stubGlobal('location', {
      pathname: '/test/page',
    });
  });

  it('should call window.history.pushState on push', () => {
    sut.push('/test');
    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/test');
    expect(window.scrollTo).not.toBeCalled();
  });

  it('should call window.history.replaceState on replace', () => {
    sut.replace('/replace');
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      '',
      '/replace'
    );
    expect(window.scrollTo).not.toBeCalled();
  });

  it('should scroll when scroll option is true on push', () => {
    sut.push('/scroll', { scroll: true });
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });

  it('should scroll when scroll option is true on replace', () => {
    sut.replace('/scroll', { scroll: true });
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });

  it('should return current pathname', () => {
    expect(sut.getPathname()).toBe('/test/page');
  });
});

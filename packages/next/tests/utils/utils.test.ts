import { isPagesRouter } from '../../src/utils';

describe('utils: isPagesRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    delete window.next;
  });

  it('should return true when window.next.router.state.asPath is a string', () => {
    window.next = {
      // @ts-ignore
      router: {
        state: {
          asPath: '/home',
        },
      },
    };

    expect(isPagesRouter()).toBe(true);
  });

  it('should return false when path is not a string', () => {
    window.next = {
      router: {
        state: {
          // @ts-ignore
          asPath: 123,
        },
      },
    };

    expect(isPagesRouter()).toBe(false);
  });

  it('should return false when window.next does not exist', () => {
    expect(isPagesRouter()).toBe(false);
  });

  it('should return false when router does not exist', () => {
    // @ts-ignore
    window.next = {};
    expect(isPagesRouter()).toBe(false);
  });

  it('should return false when state does not exist', () => {
    // @ts-ignore
    window.next = { router: {} };
    expect(isPagesRouter()).toBe(false);
  });
});

import { NextHistoryAdapter } from '../../src/adapters/next-history-adapter';
import { isPagesRouter } from '../../src/utils';
import { NextAppRouterAdapter } from '../../src/adapters/next-app-router-adapter';
import { NextPagesRouterAdapter } from '../../src/adapters/next-pages-router-adapter';
import type { Mock } from 'vitest';

vi.mock('../../src/utils', () => ({
  isPagesRouter: vi.fn(),
}));

vi.mock('../../src/adapters/next-app-router-adapter', () => ({
  NextAppRouterAdapter: vi.fn().mockImplementation(() => ({
    type: 'app-router',
  })),
}));

vi.mock('../../src/adapters/next-pages-router-adapter', () => ({
  NextPagesRouterAdapter: vi.fn().mockImplementation(() => ({
    type: 'pages-router',
  })),
}));

describe('NextHistoryAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an instance of NextPagesRouterAdapter when isPagesRouter() returns true', () => {
    (isPagesRouter as Mock).mockReturnValue(true);

    const result = NextHistoryAdapter();

    expect(isPagesRouter).toHaveBeenCalled();
    expect(result).toEqual({ type: 'pages-router' });
    expect(NextPagesRouterAdapter).toHaveBeenCalled();
    expect(NextAppRouterAdapter).not.toHaveBeenCalled();
  });

  it('should return an instance of NextAppRouterAdapter when isPagesRouter() returns false', () => {
    (isPagesRouter as Mock).mockReturnValue(false);

    const result = NextHistoryAdapter();

    expect(isPagesRouter).toHaveBeenCalled();
    expect(result).toEqual({ type: 'app-router' });
    expect(NextAppRouterAdapter).toHaveBeenCalled();
    expect(NextPagesRouterAdapter).not.toHaveBeenCalled();
  });
});

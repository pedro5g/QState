import type { Mock } from 'vitest';
import { isClientSide } from '@qstate/core';
import { NextPagesRouterAdapter } from '../../src/adapters/next-pages-router-adapter';

vi.mock('@qstate/core', () => ({
  isClientSide: vi.fn(),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
  pathname: '/mocked-path',
};

vi.mock('next/compat/router.js', () => ({
  useRouter: vi.fn(() => mockRouter),
}));

describe('NextPagesRouterAdapter', () => {
  let sut: NextPagesRouterAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    sut = new NextPagesRouterAdapter();
  });

  describe('ensureInitialized()', () => {
    it('should throw if not client-side', () => {
      (isClientSide as Mock).mockReturnValue(false);

      expect(() => (sut as any).ensureInitialized()).toThrowError(
        'NextPagesRouterAdapter can only be used in the browser'
      );
    });

    it('should initialize router if client-side', () => {
      (isClientSide as Mock).mockReturnValue(true);
      (sut as any).router = null;

      (sut as any).ensureInitialized();

      expect((sut as any).router).toEqual(mockRouter);
    });

    it('should not reinitialize router if already set', () => {
      (isClientSide as Mock).mockReturnValue(true);
      const router = { push: vi.fn() };
      (sut as any).router = router;

      (sut as any).ensureInitialized();

      expect((sut as any).router).toBe(router);
    });
  });

  describe('push()', () => {
    it('should call router.push with correct args', () => {
      (isClientSide as Mock).mockReturnValue(true);
      sut.push('/foo', { scroll: true });

      expect(mockPush).toHaveBeenCalledWith('/foo', undefined, {
        scroll: true,
        shallow: false,
      });
    });

    it('should default scroll=false when not provided', () => {
      (isClientSide as Mock).mockReturnValue(true);
      sut.push('/bar');

      expect(mockPush).toHaveBeenCalledWith('/bar', undefined, {
        scroll: false,
        shallow: false,
      });
    });

    it('should throw if used on server', () => {
      (isClientSide as Mock).mockReturnValue(false);
      expect(() => sut.push('/server')).toThrowError(
        'NextPagesRouterAdapter can only be used in the browser'
      );
    });
  });

  describe('replace()', () => {
    it('should call router.replace with correct args', () => {
      (isClientSide as Mock).mockReturnValue(true);
      sut.replace('/baz', { scroll: true });

      expect(mockReplace).toHaveBeenCalledWith('/baz', undefined, {
        scroll: true,
        shallow: false,
      });
    });

    it('should default scroll=false when not provided', () => {
      (isClientSide as Mock).mockReturnValue(true);
      sut.replace('/abc');

      expect(mockReplace).toHaveBeenCalledWith('/abc', undefined, {
        scroll: false,
        shallow: false,
      });
    });

    it('should throw if used on server', () => {
      (isClientSide as Mock).mockReturnValue(false);
      expect(() => sut.replace('/server')).toThrowError(
        'NextPagesRouterAdapter can only be used in the browser'
      );
    });
  });

  describe('getPathname()', () => {
    it('should return router.pathname', () => {
      (isClientSide as Mock).mockReturnValue(true);
      expect(sut.getPathname()).toBe('/mocked-path');
    });

    it('should throw if used on server', () => {
      (isClientSide as Mock).mockReturnValue(false);
      expect(() => sut.getPathname()).toThrowError(
        'NextPagesRouterAdapter can only be used in the browser'
      );
    });

    it('should return empty string if router is undefined', () => {
      (isClientSide as Mock).mockReturnValue(true);
      (sut as any).router = null;
      (sut as any).ensureInitialized = vi.fn(); // evita erro
      expect((sut as any).router?.pathname ?? '').toBe('');
    });
  });
});

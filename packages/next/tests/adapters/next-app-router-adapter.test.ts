import { NextAppRouterAdapter } from '../../src/adapters/next-app-router-adapter';
import { useRouter, usePathname } from 'next/navigation.js';
import { isClientSide } from '@qstate/core';
import type { Mock } from 'vitest';

vi.mock('next/navigation.js', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock('@qstate/core', () => ({
  isClientSide: vi.fn(),
}));

describe('NextAppRouterAdapter', () => {
  let sut: NextAppRouterAdapter;
  let pushMock: ReturnType<typeof vi.fn>;
  let replaceMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    pushMock = vi.fn();
    replaceMock = vi.fn();

    (useRouter as unknown as Mock).mockReturnValue({
      push: pushMock,
      replace: replaceMock,
    });
    (usePathname as unknown as Mock).mockReturnValue('/home');
    (isClientSide as unknown as Mock).mockReturnValue(true);

    sut = new NextAppRouterAdapter();
  });

  describe('ensureInitialized', () => {
    it('should throw if called on server side', () => {
      (isClientSide as unknown as Mock).mockReturnValue(false);

      expect(() => sut['ensureInitialized']()).toThrowError(
        'NextAppRouterAdapter can only be used in the browser'
      );
    });

    it('should initialize router and pathname when client side', () => {
      sut['ensureInitialized']();

      expect(useRouter).toHaveBeenCalledTimes(1);
      expect(usePathname).toHaveBeenCalledTimes(1);

      expect((sut as any).router).toBeDefined();
      expect((sut as any).pathname).toBe('/home');
    });

    it('should not reinitialize if already initialized', () => {
      sut['ensureInitialized']();
      sut['ensureInitialized']();

      expect(useRouter).toHaveBeenCalledTimes(1);
      expect(usePathname).toHaveBeenCalledTimes(1);
    });
  });

  describe('push', () => {
    it('should call router.push with full url and scroll option', () => {
      sut.push('?page=2', { scroll: true });

      expect(pushMock).toHaveBeenCalledWith('/home?page=2', { scroll: true });
    });

    it('should use scroll=false by default', () => {
      sut.push('?page=3');

      expect(pushMock).toHaveBeenCalledWith('/home?page=3', { scroll: false });
    });

    it('should warn if router not initialized', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      (isClientSide as unknown as Mock).mockReturnValue(true);

      (useRouter as unknown as Mock).mockReturnValue(null);
      (usePathname as unknown as Mock).mockReturnValue('');

      (sut as any).router = null;
      (sut as any).pathname = '';

      sut.push('?x=1');

      expect(warnSpy).toHaveBeenCalledWith('Router not initialized');
      warnSpy.mockRestore();
    });
  });

  describe('replace', () => {
    it('should call router.replace with full url and scroll option', () => {
      sut.replace('?page=2', { scroll: true });

      expect(replaceMock).toHaveBeenCalledWith('/home?page=2', {
        scroll: true,
      });
    });

    it('should use scroll=false by default', () => {
      sut.replace('?page=4');

      expect(replaceMock).toHaveBeenCalledWith('/home?page=4', {
        scroll: false,
      });
    });

    it('should warn if router not initialized', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      (isClientSide as unknown as Mock).mockReturnValue(true);

      (useRouter as unknown as Mock).mockReturnValue(null);
      (usePathname as unknown as Mock).mockReturnValue('');

      (sut as any).router = null;
      (sut as any).pathname = '';

      sut.replace('?y=1');

      expect(warnSpy).toHaveBeenCalledWith('Router not initialized');
      warnSpy.mockRestore();
    });
  });

  describe('getPathname', () => {
    it('should return current pathname', () => {
      const path = sut.getPathname();
      expect(path).toBe('/home');
    });

    it('should throw if called on server side', () => {
      (isClientSide as unknown as Mock).mockReturnValue(false);
      expect(() => sut.getPathname()).toThrow();
    });
  });
});

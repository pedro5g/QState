'use client';
import { isClientSide, type HistoryAdapter } from '@qstate/core';
import { usePathname, useRouter } from 'next/navigation.js';

export class NextAppRouterAdapter implements HistoryAdapter {
  private router: ReturnType<typeof useRouter> | null = null;
  private pathname: string = '';

  private ensureInitialized(): void {
    if (!isClientSide()) {
      throw new Error('NextAppRouterAdapter can only be used in the browser');
    }

    if (!this.router) {
      this.router = useRouter();
      this.pathname = usePathname();
    }
  }

  push(
    url: string,
    options?: {
      scroll?: boolean;
    }
  ): void {
    this.ensureInitialized();

    const { scroll = false } = options || {};

    if (!this.router || !this.pathname) {
      console.warn('Router not initialized');
      return;
    }

    const fullUrl = `${this.pathname}${url}`;

    this.router.push(fullUrl, {
      scroll,
    });
  }

  replace(
    url: string,
    options?: {
      scroll?: boolean;
    }
  ): void {
    this.ensureInitialized();

    const { scroll = false } = options || {};

    if (!this.router || !this.pathname) {
      console.warn('Router not initialized');
      return;
    }

    const fullUrl = `${this.pathname}${url}`;

    this.router.replace(fullUrl, {
      scroll,
    });
  }

  getPathname(): string {
    this.ensureInitialized();
    return this.pathname;
  }
}

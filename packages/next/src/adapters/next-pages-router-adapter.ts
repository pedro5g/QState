import { useRouter } from 'next/compat/router.js';
import { isClientSide, type HistoryAdapter } from '@qstate/core';

export class NextPagesRouterAdapter implements HistoryAdapter {
  private router: ReturnType<typeof useRouter> | null = null;

  private ensureInitialized(): void {
    if (!isClientSide()) {
      throw new Error('NextPagesRouterAdapter can only be used in the browser');
    }

    if (!this.router) {
      this.router = useRouter();
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

    this.router?.push(url, undefined, {
      scroll,
      shallow: false,
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

    this.router?.replace(url, undefined, {
      scroll,
      shallow: false,
    });
  }

  getPathname(): string {
    this.ensureInitialized();
    return this.router?.pathname ?? '';
  }
}

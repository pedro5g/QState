import type { NextRouter } from 'next/router';

declare global {
  interface Window {
    next?: {
      router?: NextRouter & {
        state: {
          asPath: string;
        };
      };
    };
  }
}

export const isPagesRouter = () =>
  typeof window.next?.router?.state?.asPath === 'string';

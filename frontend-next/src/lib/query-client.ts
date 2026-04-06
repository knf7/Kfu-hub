'use client';

import { QueryClient } from '@tanstack/react-query';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: 1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
        refetchIntervalInBackground: false,
        networkMode: 'online',
      },
      mutations: {
        retry: 1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
        networkMode: 'online',
      },
    },
  });

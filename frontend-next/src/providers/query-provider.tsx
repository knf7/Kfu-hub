'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { createQueryClient } from '@/lib/query-client';

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(createQueryClient);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
}

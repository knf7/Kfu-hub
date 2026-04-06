'use client';

import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/providers/theme-provider';
import QueryProviders from '@/providers/query-provider';

export default function HeavyProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProviders>
        {children}
        <Toaster position="top-center" />
      </QueryProviders>
    </ThemeProvider>
  );
}

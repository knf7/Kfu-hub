'use client';

import { usePathname } from 'next/navigation';
import HeavyProviders from '@/providers/heavy-providers';

const PUBLIC_PATHS = new Set([
  '/',
  '/pricing',
  '/plans',
  '/how-it-works',
  '/contact',
  '/legal',
  '/privacy',
  '/terms',
  '/usage-policy',
]);

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.has(pathname) || pathname.startsWith('/sentry-example-page');

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname && isPublicPath(pathname)) {
    return <>{children}</>;
  }

  return <HeavyProviders>{children}</HeavyProviders>;
}

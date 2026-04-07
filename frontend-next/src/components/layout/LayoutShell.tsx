'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { appToast } from '@/components/ui/sonner';
import { customersAPI, loansAPI, reportsAPI } from '@/lib/api';
import {
  IconAnalytics,
  IconClipboard,
  IconDashboard,
  IconDiamond,
  IconLogout,
  IconLoans,
  IconMessageCircle,
  IconPlus,
  IconScale,
  IconSettings,
  IconStar,
  IconStore,
  IconUser,
  IconUsers,
} from './icons';
import AnimatedBackground from './AnimatedBackground';
import SupportWidget from './SupportWidget';
import '@/app/dashboard/layout-shell.css';

type Merchant = {
  store_name?: string;
  email?: string;
  subscription_plan?: string;
  role?: 'merchant' | 'employee' | string;
  permissions?: Record<string, boolean> | null;
};

type NavItem = {
  path: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'الرئيسية', Icon: IconDashboard },
  { path: '/dashboard/quick-entry', label: 'الإدخال السريع', Icon: IconMessageCircle },
  { path: '/dashboard/customers', label: 'العملاء', Icon: IconUsers },
  { path: '/dashboard/loans', label: 'القروض', Icon: IconLoans },
  { path: '/dashboard/najiz', label: 'قضايا ناجز', Icon: IconScale },
  { path: '/dashboard/monthly-report', label: 'التقرير الشهري', Icon: IconClipboard },
  { path: '/dashboard/analytics', label: 'التحليلات', Icon: IconAnalytics },
  { path: '/dashboard/settings', label: 'الإعدادات', Icon: IconSettings },
];

const scheduleIdle = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  const windowWithIdle = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const idle = windowWithIdle.requestIdleCallback;
  const cancelIdle = windowWithIdle.cancelIdleCallback;
  if (idle) {
    const id = idle(callback, { timeout: 2000 });
    return () => cancelIdle?.(id);
  }
  const id = window.setTimeout(callback, 600);
  return () => window.clearTimeout(id);
};

const readStoredMerchant = (): Merchant => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('merchant') || '{}');
  } catch {
    return {};
  }
};

const findNavMatch = (currentPath: string) => {
  const matches = NAV_ITEMS.filter((item) => currentPath === item.path || currentPath?.startsWith(`${item.path}/`));
  return matches.sort((a, b) => b.path.length - a.path.length)[0];
};

function Breadcrumb({ pathname }: { pathname: string }) {
  const currentItem = findNavMatch(pathname);
  if (!currentItem || pathname === '/dashboard') return null;
  return (
    <nav className="breadcrumb" aria-label="مسار التصفح">
      <Link href="/dashboard" className="breadcrumb-link">الرئيسية</Link>
      <span className="breadcrumb-sep" aria-hidden="true">›</span>
      <span className="breadcrumb-current" aria-current="page">{currentItem.label}</span>
    </nav>
  );
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser] = useState<Merchant>(readStoredMerchant);
  const merchant = currentUser;
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (localStorage.getItem('theme') || 'light') === 'dark';
  });
  const [quickEntryExpandedPath, setQuickEntryExpandedPath] = useState<string | null>(null);

  const currentTitle = useMemo(() => {
    const current = findNavMatch(pathname);
    return current?.label || 'لوحة التحكم';
  }, [pathname]);
  const merchantInitial = useMemo(() => {
    const source = String(merchant.store_name || merchant.email || 'م').trim();
    return source ? source.charAt(0).toUpperCase() : 'م';
  }, [merchant.email, merchant.store_name]);

  const hasPageAccess = useCallback((path: string) => {
    if (!currentUser.role || currentUser.role === 'merchant') return true;
    const perms = currentUser.permissions || {};
    if (path === '/dashboard') return !!perms.can_view_dashboard;
    if (path.startsWith('/dashboard/quick-entry')) return !!perms.can_add_loans;
    if (path.startsWith('/dashboard/loans')) return !!perms.can_view_loans;
    if (path.startsWith('/dashboard/customers')) return !!perms.can_view_customers;
    if (path.startsWith('/dashboard/najiz')) return !!(perms.can_view_najiz || perms.can_view_loans);
    if (path.startsWith('/dashboard/monthly-report')) return !!(perms.can_view_dashboard || perms.can_view_analytics);
    if (path.startsWith('/dashboard/analytics')) return !!perms.can_view_analytics;
    if (path.startsWith('/dashboard/settings')) return !!perms.can_view_settings;
    return true;
  }, [currentUser.permissions, currentUser.role]);

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => hasPageAccess(item.path)),
    [hasPageAccess]
  );

  const showQuickEntryShortcut = hasPageAccess('/dashboard/quick-entry') && pathname !== '/dashboard/quick-entry';
  const quickEntryExpanded = showQuickEntryShortcut && quickEntryExpandedPath === pathname;

  useEffect(() => {
    if (!quickEntryExpanded) return;
    const timeoutId = window.setTimeout(() => setQuickEntryExpandedPath(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [quickEntryExpanded]);

  const handleQuickEntryShortcutClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!quickEntryExpanded) {
      event.preventDefault();
      setQuickEntryExpandedPath(pathname);
      return;
    }
    setQuickEntryExpandedPath(null);
  }, [pathname, quickEntryExpanded]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const palette = 'aero-silver';
    localStorage.setItem('color_palette', palette);
    document.documentElement.setAttribute('data-color-palette', palette);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token && pathname !== '/login') {
      appToast.error('انتهت الجلسة، الرجاء تسجيل الدخول مجدداً.');
      router.replace('/login');
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!pathname || hasPageAccess(pathname)) return;
    const fallback = visibleNavItems[0]?.path || '/login';
    if (pathname !== fallback) {
      router.replace(fallback);
    }
  }, [pathname, hasPageAccess, router, visibleNavItems]);

  useEffect(() => {
    if (!visibleNavItems.length) return;
    const routeSet = new Set<string>(visibleNavItems.map((item) => item.path));
    if (pathname) routeSet.delete(pathname);
    const routes = Array.from(routeSet);
    if (routes.length === 0) return;
    return scheduleIdle(() => {
      routes.forEach((path) => router.prefetch(path));
    });
  }, [router, pathname, visibleNavItems]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nav = navigator as Navigator & {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
      };
    };
    const connection = nav.connection;
    if (connection?.saveData) return;
    if (typeof connection?.effectiveType === 'string' && ['slow-2g', '2g'].includes(connection.effectiveType)) {
      return;
    }

    return scheduleIdle(() => {
      customersAPI.prefetchAll({ page: 1, limit: 15, include_stats: false });
      loansAPI.prefetchAll({ page: 1, limit: 20 });
      if (visibleNavItems.some((item) => item.path === '/dashboard/najiz')) {
        loansAPI.prefetchAll({ is_najiz_case: true, limit: 100, skip_count: true });
      }
      if (visibleNavItems.some((item) => item.path === '/dashboard/analytics')) {
        reportsAPI.getAnalytics({ interval: 'year' });
      }
      if (visibleNavItems.some((item) => item.path === '/dashboard/monthly-report')) {
        reportsAPI.getMonthlySummary({});
      }
      if (visibleNavItems.some((item) => item.path === '/dashboard')) {
        reportsAPI.getDashboard({});
      }
    });
  }, [visibleNavItems]);

  useEffect(() => {
    const runMonthEndNotice = async () => {
      if (currentUser.role && currentUser.role !== 'merchant') return;
      const now = new Date();
      const day = now.getDate();
      if (day < 28) return;

      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const key = `month_end_overdue_notice_${y}-${m}`;
      if (localStorage.getItem(key) === '1') return;

      try {
        const res = await reportsAPI.getDashboard({});
        const maybeData = (res && typeof res === 'object' && 'data' in res)
          ? (res as { data?: unknown }).data
          : res;
        const dashboardData = (maybeData || {}) as { metrics?: { overdueCustomers?: number } };
        const overdueCount = Number(dashboardData.metrics?.overdueCustomers || 0);
        if (overdueCount > 0) {
          appToast.warning(`تنبيه نهاية الشهر: لديك ${overdueCount.toLocaleString('en-US')} عميل متأخر عن السداد.`);
          localStorage.setItem(key, '1');
        }
      } catch {
        // Silent: this notice is non-critical.
      }
    };

    return scheduleIdle(runMonthEndNotice);
  }, [currentUser.role]);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    router.push('/login');
  }, [router]);

  return (
    <div className="ops-shell bottom-nav-mode">
      <AnimatedBackground />

      <main className="ops-main">
        <header className="topbar">
          <div className="topbar-main">
            <div>
              <h1 className="topbar-title">{currentTitle}</h1>
              <Breadcrumb pathname={pathname} />
            </div>
            {merchant.store_name && <div className="topbar-store">{merchant.store_name}</div>}
          </div>

          <div className="topbar-actions">
            <div className="topbar-cta-group">
              {hasPageAccess('/dashboard/loans/new') && (
                <Link
                  href="/dashboard/loans/new"
                  className="topbar-cta topbar-cta-primary"
                  aria-label="إضافة قرض جديد"
                >
                  <IconPlus size={14} />
                  <span>إضافة قرض</span>
                </Link>
              )}
              <Link
                href="/plans"
                className="topbar-cta topbar-cta-secondary"
                aria-label="جرب الآن مجاناً"
              >
                <IconStore size={14} />
                <span>جرب الآن مجاناً</span>
              </Link>
              {showQuickEntryShortcut && (
                <Link
                  href="/dashboard/quick-entry"
                  className={`quick-entry-mini ${quickEntryExpanded ? 'expanded' : ''}`}
                  onClick={handleQuickEntryShortcutClick}
                  onBlur={() => setQuickEntryExpandedPath(null)}
                  aria-label="الإدخال السريع"
                  aria-expanded={quickEntryExpanded}
                  title={quickEntryExpanded ? 'فتح الإدخال السريع' : 'إدخال سريع'}
                >
                  <IconMessageCircle size={15} />
                  <span>{quickEntryExpanded ? 'فتح الإدخال السريع' : 'إدخال سريع'}</span>
                </Link>
              )}
            </div>
            <div className="topbar-user-tools">
              <button
                type="button"
                className="theme-chip"
                onClick={() => setDarkMode((prev) => !prev)}
                aria-label={darkMode ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
                title={darkMode ? 'وضع نهاري' : 'وضع ليلي'}
              >
                {darkMode ? <IconDiamond size={16} /> : <IconStar size={16} />}
                <span>{darkMode ? 'نهاري' : 'ليلي'}</span>
              </button>
              <div
                className="topbar-avatar"
                role="img"
                aria-label={`المستخدم الحالي ${merchant.store_name || merchant.email || 'الحساب'}`}
                title={merchant.store_name || merchant.email || 'الحساب'}
              >
                <span className="topbar-avatar-letter">{merchantInitial}</span>
                <IconUser size={13} />
              </div>
            </div>
          </div>
        </header>

        <section className="page-surface">
          {children}
        </section>
      </main>

      <nav className="bottom-dock" aria-label="التنقل السفلي">
        <div className="bottom-dock-inner">
          {visibleNavItems.map(({ path, label, Icon }) => {
            const active = pathname === path || pathname?.startsWith(`${path}/`);
            return (
              <Link
                key={path}
                href={path}
                className={`dock-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={label}
              >
                <span className="dock-icon"><Icon size={18} /></span>
                <span className="dock-label">{label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            className="dock-item dock-action danger"
            onClick={handleLogout}
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
          >
            <span className="dock-icon"><IconLogout size={17} /></span>
            <span className="dock-label">خروج</span>
          </button>
        </div>
      </nav>

      <SupportWidget />
    </div>
  );
}

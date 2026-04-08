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
  IconDownload,
  IconLoans,
  IconMessageCircle,
  IconScale,
  IconSettings,
  IconUsers,
} from './icons';
import { Menu, Moon, Sun, Plus, LogOut } from 'lucide-react';
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
  { path: '/dashboard/loans/import', label: 'مركز الاستيراد', Icon: IconDownload },
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
      <span className="breadcrumb-sep text-[#94a3b8]" aria-hidden="true">/</span>
      <span className="breadcrumb-current" aria-current="page">{currentItem.label}</span>
    </nav>
  );
}

function AseelMiniLogo() {
  return (
    <span
      aria-label="شعار أصيل"
      className="ops-logo-mark"
      dir="ltr"
    >
      <span className="ops-logo-bar ops-logo-bar-sm" />
      <span className="ops-logo-bar ops-logo-bar-lg" />
      <span className="ops-logo-stack">
        <span className="ops-logo-dot" />
        <span className="ops-logo-bar ops-logo-bar-xs" />
      </span>
    </span>
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
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    if (path.startsWith('/dashboard/loans/import')) return !!(perms.can_upload_loans || perms.can_add_loans);
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

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

  // Pre-fetch critical API data
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
    if (nav.connection?.saveData || ['slow-2g', '2g'].includes(nav.connection?.effectiveType || '')) return;

    return scheduleIdle(() => {
      customersAPI.prefetchAll({ page: 1, limit: 15, include_stats: false });
      loansAPI.prefetchAll({ page: 1, limit: 20 });
      if (visibleNavItems.some((item) => item.path === '/dashboard/najiz')) {
        loansAPI.prefetchAll({ is_najiz_case: true, limit: 100, skip_count: true });
      }
      if (visibleNavItems.some((item) => item.path === '/dashboard/analytics')) {
        reportsAPI.getAnalytics({ interval: 'year' });
      }
    });
  }, [visibleNavItems]);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    router.push('/login');
  }, [router]);

  return (
    <div className="ops-shell font-sans text-[#0f1c33] bg-[#f8fafc] dark:bg-[#0b1221] dark:text-[#f8fafc]" dir="rtl">
      
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
           className="fixed inset-0 bg-black/50 z-30 md:hidden" 
           onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Structured Sidebar (Enterprise) */}
      <aside className={`ops-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="ops-sidebar-header">
           <div className="ops-sidebar-brand text-[1.2rem]">
              <AseelMiniLogo />
              <span className="ops-sidebar-brand-text">أصيل المالي</span>
           </div>
        </div>
        
        <nav className="ops-sidebar-nav">
          {visibleNavItems.map(({ path, label, Icon }) => {
            const active = pathname === path || pathname?.startsWith(`${path}/`);
            return (
              <Link key={path} href={path} className={`sidebar-item ${active ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                <span className="sidebar-item-icon"><Icon size={20} /></span>
                <span className="sidebar-item-label">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ops-sidebar-footer">
           <button onClick={handleLogout} className="flex items-center gap-3 w-full p-2 text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors font-semibold text-[0.95rem]">
              <LogOut size={18} />
              <span>تسجيل الخروج</span>
           </button>
        </div>
      </aside>

      <div className="ops-main-wrapper relative z-20">
        {/* Solid Flat Topbar */}
        <header className="ops-topbar">
          <div className="topbar-left">
            <button className="mobile-toggle" onClick={() => setIsSidebarOpen(true)}>
               <Menu size={24} />
            </button>
            <div className="hidden md:block">
              <Breadcrumb pathname={pathname} />
              <h1 className="topbar-title">{currentTitle}</h1>
            </div>
            {/* Mobile Title */}
            <div className="md:hidden font-bold text-[1.1rem]">
              {currentTitle}
            </div>
          </div>

          <div className="topbar-right">
            <div className="hidden sm:flex items-center gap-3 mr-4 border-l border-slate-200 dark:border-slate-800 pl-4">
               {hasPageAccess('/dashboard/loans/new') && (
                 <Link href="/dashboard/loans/new" className="topbar-btn topbar-btn-primary">
                   <Plus size={16} />
                   <span>إضافة قرض</span>
                 </Link>
               )}
            </div>

            <div className="topbar-tools">
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={() => setDarkMode((prev) => !prev)}
                aria-label={darkMode ? 'نهاري' : 'ليلي'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div
                className="topbar-avatar"
                title={merchant.store_name || merchant.email || 'الحساب'}
              >
                {merchantInitial}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Grid Area */}
        <main className="ops-content">
          <div className="max-w-[1440px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <SupportWidget />
    </div>
  );
}

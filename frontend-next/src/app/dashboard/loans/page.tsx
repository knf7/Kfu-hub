'use client';

import React, { useState, useEffect, useCallback, useMemo, useDeferredValue, useTransition, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { loansAPI, customersAPI } from '@/lib/api';
import { appToast } from '@/components/ui/sonner';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/async-state';
import { DataTablePro, type DataTableBulkAction, type DataTableFilterConfig } from '@/components/ui/data-table-pro';
import {
    IconUpload, IconDownload, IconPlus, IconTrash,
    IconWhatsapp, IconScale, IconEdit
} from '@/components/layout/icons';
import MoneyRain from '@/components/layout/MoneyRain';
import { useDataSync } from '@/hooks/useDataSync';
import { useDebounce } from '@/hooks/useDebounce';
import './loans.css';

const INTEREST_OPTIONS = [10, 20, 30];

const normalizeInterestRate = (rate: number) => (
    INTEREST_OPTIONS.includes(rate) ? rate : INTEREST_OPTIONS[0]
);

const buildLoanQueryParams = (filters: any, page: number, limit: number) => {
    const searchValue = String(filters.search || '').trim();
    const params: Record<string, any> = {
        page,
        limit
    };

    if (searchValue) params.search = searchValue;
    if (filters.status) params.status = filters.status;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.delayed) params.delayed = true;
    if (searchValue) params.skip_count = true;

    return params;
};

const formatRiyal = (value: number) => `${value.toLocaleString('en-US')} ﷼`;

const getLoanComputedValues = (loan: any) => {
    const principal = parseFloat(loan.principal_amount || loan.amount || 0);
    const total = parseFloat(loan.amount || 0);
    const raised = parseFloat(loan.najiz_case_amount || 0);
    const collected = loan.status === 'Paid'
        ? parseFloat(loan.najiz_case_amount || loan.najiz_collected_amount || loan.amount || 0)
        : parseFloat(loan.najiz_collected_amount || 0);
    const caseTrack = Boolean(loan.is_najiz_case || loan.najiz_case_number);
    return { principal, total, raised, collected, caseTrack };
};

const getLoanStatusLabel = (status: string) => (
    status === 'Active' ? 'نشط' :
        status === 'Paid' ? 'تم التسديد' :
            status === 'Raised' ? 'قضايا' :
                status === 'Cancelled' ? 'ملغي' : status
);

const getLoanRowStateClass = (loan: any) => {
    const txDate = loan.transaction_date ? new Date(loan.transaction_date) : new Date();
    const now = new Date();
    const txMonthKey = txDate.getFullYear() * 12 + txDate.getMonth();
    const currentMonthKey = now.getFullYear() * 12 + now.getMonth();
    const isAfterMonthEnd = txMonthKey < currentMonthKey;
    if (loan.status === 'Paid') return 'loan-row-paid';
    if (loan.status === 'Raised') return 'loan-row-raised';
    if (loan.status === 'Active' && isAfterMonthEnd) return 'loan-row-overdue';
    return '';
};

const LoansPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialCache = useMemo(
        () => loansAPI.peekAll({ page: 1, limit: 20 }),
        []
    );
    const [loans, setLoans] = useState<any[]>(() => initialCache?.loans || []);
    const [loading, setLoading] = useState(!initialCache);
    const [loadError, setLoadError] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        startDate: '',
        endDate: '',
        delayed: false
    });
    const debouncedSearch = useDebounce(filters.search, 350);
    const filterSnapshot = useMemo(() => ({
        search: debouncedSearch,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        delayed: filters.delayed
    }), [debouncedSearch, filters.status, filters.startDate, filters.endDate, filters.delayed]);
    const deferredFilters = useDeferredValue(filterSnapshot);
    const [, startTransition] = useTransition();
    const [pagination, setPagination] = useState<{ page: number; limit: number; totalPages: number }>(() => ({
        page: initialCache?.pagination?.page ?? 1,
        limit: initialCache?.pagination?.limit ?? 20,
        totalPages: initialCache?.pagination?.totalPages ?? 1
    }));
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingLoan, setEditingLoan] = useState<any>(null);
    const [showMoneyRain, setShowMoneyRain] = useState(false);
    const [deleteLoanId, setDeleteLoanId] = useState<string | null>(null);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loansRef = useRef<any[]>(loans);
    const requestIdRef = useRef(0);

    useEffect(() => {
        loansRef.current = loans;
    }, [loans]);

    useEffect(() => {
        const statusParam = searchParams.get('status');
        const delayedParam = searchParams.get('delayed');
        if (statusParam || delayedParam) {
            setFilters(prev => ({
                ...prev,
                status: statusParam || '',
                delayed: delayedParam === 'true'
            }));
        }
    }, [searchParams]);

    const fetchLoans = useCallback(async (pageOverride?: number, opts: { forceFresh?: boolean } = {}) => {
        const requestId = ++requestIdRef.current;
        setLoadError('');
        try {
            const requestPage = pageOverride ?? pagination.page;
            const forceFresh = Boolean(opts.forceFresh);
            const params = buildLoanQueryParams(deferredFilters, requestPage, pagination.limit);
            if (forceFresh) {
                params._t = Date.now();
            }
            const cached = forceFresh ? null : loansAPI.peekAll(params);
            if (cached) {
                setLoans(cached.loans || []);
                setPagination(prev => ({
                    ...prev,
                    page: requestPage,
                    totalPages: cached.pagination?.totalPages ?? prev.totalPages
                }));
                setLoading(false);
            } else if (loans.length === 0) {
                setLoading(true);
            }
            const response = await loansAPI.getAll(params);
            if (requestId !== requestIdRef.current) return;
            const data = response.data || response;
            setLoans(data.loans || []);
            setPagination(prev => ({
                ...prev,
                page: requestPage,
                totalPages: data.pagination?.totalPages ?? 1
            }));
            const prefetchParams = { ...params, _t: undefined };

            const nextTotalPages = data.pagination?.totalPages ?? 1;
            if (requestPage < nextTotalPages) {
                loansAPI.prefetchAll({ ...prefetchParams, page: requestPage + 1 });
            }
            if (requestPage > 1) {
                loansAPI.prefetchAll({ ...prefetchParams, page: requestPage - 1 });
            }
        } catch (error: any) {
            console.error('Failed to fetch loans:', error);
            if (loansRef.current.length === 0) {
                const status = error?.response?.status;
                if (status === 401) {
                    setLoadError('انتهت الجلسة. الرجاء تسجيل الدخول من جديد.');
                } else if (status === 403) {
                    setLoadError('لا تملك صلاحية الوصول إلى هذه البيانات.');
                } else {
                    setLoadError('تعذر تحميل القروض حالياً. تحقق من الاتصال أو أعد المحاولة.');
                }
            }
        } finally {
            setLoading(false);
        }
    }, [deferredFilters, loans.length, pagination.limit, pagination.page]);

    useEffect(() => {
        fetchLoans();
    }, [fetchLoans]);

    const scheduleRefresh = useCallback((delay = 250, forceFresh = false) => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => fetchLoans(pagination.page, { forceFresh }), delay);
    }, [fetchLoans, pagination.page]);

    useDataSync(() => {
        scheduleRefresh(200, true);
    }, { scopes: ['loans', 'customers', 'dashboard'], debounceMs: 200 });

    const handleStatusChange = useCallback(async (loanId: string, newStatus: string) => {
        const previous = loansRef.current;
        setLoans((prev) => prev.map((loan) => (
            loan.id === loanId ? { ...loan, status: newStatus } : loan
        )));
        if (newStatus === 'Paid') {
            setShowMoneyRain(true);
        }
        try {
            const res = await loansAPI.updateStatus(loanId, newStatus);
            const updated = (res as any)?.data?.loan || (res as any)?.loan;
            if (updated) {
                setLoans((prev) => prev.map((loan) => (
                    loan.id === loanId ? { ...loan, ...updated } : loan
                )));
            }
            scheduleRefresh(200, true);
        } catch (error: any) {
            try {
                const res = await loansAPI.update(loanId, { status: newStatus });
                const updated = (res as any)?.data?.loan || (res as any)?.loan;
                if (updated) {
                    setLoans((prev) => prev.map((loan) => (
                        loan.id === loanId ? { ...loan, ...updated } : loan
                    )));
                }
                scheduleRefresh(200, true);
                return;
            } catch (fallbackError: any) {
                setLoans(previous);
                appToast.error(
                    fallbackError?.response?.data?.error ||
                    error?.response?.data?.error ||
                    fallbackError?.message ||
                    error?.message ||
                    'فشل تحديث الحالة'
                );
            }
        }
    }, [scheduleRefresh]);

    const handleDelete = useCallback((loanId: string) => {
        setDeleteLoanId(loanId);
    }, []);

    const confirmDelete = async () => {
        if (!deleteLoanId) return;
        const previous = loansRef.current;
        setLoans((prev) => prev.filter((loan) => loan.id !== deleteLoanId));
        try {
            await loansAPI.delete(deleteLoanId);
            scheduleRefresh(200, true);
            appToast.success('تم حذف القرض');
        } catch (error: any) {
            setLoans(previous);
            appToast.error(error?.response?.data?.error || 'فشل حذف القرض');
        } finally {
            setDeleteLoanId(null);
        }
    };

    const handleExport = async () => {
        try {
            await loansAPI.export(filters);
        } catch (error: any) {
            appToast.error(error?.response?.data?.error || 'فشل تصدير البيانات');
        }
    };

    const pageItems = useMemo(() => {
        const items: Array<number | 'ellipsis'> = [];
        if (pagination.totalPages <= 1) return items;
        const current = pagination.page;
        const start = Math.max(1, current - 2);
        const end = Math.min(pagination.totalPages, current + 2);
        if (start > 1) {
            items.push(1);
            if (start > 2) items.push('ellipsis');
        }
        for (let i = start; i <= end; i += 1) {
            items.push(i);
        }
        if (end < pagination.totalPages) {
            if (end < pagination.totalPages - 1) items.push('ellipsis');
            items.push(pagination.totalPages);
        }
        return items;
    }, [pagination.page, pagination.totalPages]);

    const hasFiltersApplied = useMemo(
        () => Boolean(
            String(filters.search || '').trim()
            || filters.status
            || filters.startDate
            || filters.endDate
            || filters.delayed
        ),
        [filters.delayed, filters.endDate, filters.search, filters.startDate, filters.status]
    );

    const handleBulkStatusChange = useCallback(async (selectedLoans: any[], newStatus: string) => {
        const ids = selectedLoans.map((loan) => loan.id).filter(Boolean);
        if (ids.length === 0) return;
        const results = await Promise.allSettled(
            ids.map((id) => loansAPI.updateStatus(id, newStatus))
        );
        const successCount = results.filter((result) => result.status === 'fulfilled').length;
        const failedCount = ids.length - successCount;

        if (successCount > 0) {
            if (newStatus === 'Paid') setShowMoneyRain(true);
            scheduleRefresh(200, true);
            appToast.success(`تم تحديث ${successCount} قرض`);
        }
        if (failedCount > 0) {
            appToast.warning(`تعذر تحديث ${failedCount} قرض`);
        }
    }, [scheduleRefresh]);

    const handleBulkDelete = useCallback(async (selectedLoans: any[]) => {
        const ids = selectedLoans.map((loan) => loan.id).filter(Boolean);
        if (ids.length === 0) return;
        const confirmed = window.confirm(`سيتم حذف ${ids.length} قرض. هل تريد المتابعة؟`);
        if (!confirmed) return;

        const results = await Promise.allSettled(ids.map((id) => loansAPI.delete(id)));
        const successCount = results.filter((result) => result.status === 'fulfilled').length;
        const failedCount = ids.length - successCount;

        if (successCount > 0) {
            scheduleRefresh(200, true);
            appToast.success(`تم حذف ${successCount} قرض`);
        }
        if (failedCount > 0) {
            appToast.warning(`تعذر حذف ${failedCount} قرض`);
        }
    }, [scheduleRefresh]);

    const loanColumns = useMemo<ColumnDef<any>[]>(() => ([
        {
            accessorKey: 'customer_name',
            header: 'اسم العميل',
            cell: ({ row }) => (
                <div className="customer-name-cell">
                    <div className="customer-main">{row.original.customer_name}</div>
                    <div className="customer-sub">عميل</div>
                </div>
            )
        },
        {
            accessorKey: 'national_id',
            header: 'رقم الهوية',
            cell: ({ row }) => <span className="id-cell">{row.original.national_id || '-'}</span>
        },
        {
            id: 'principal_amount',
            accessorFn: (loan) => getLoanComputedValues(loan).principal,
            header: 'المبلغ الأساسي',
            cell: ({ row }) => <span className="amount amount-cell">{formatRiyal(getLoanComputedValues(row.original).principal)}</span>
        },
        {
            id: 'total_amount',
            accessorFn: (loan) => getLoanComputedValues(loan).total,
            header: 'المبلغ النهائي',
            cell: ({ row }) => <span className="amount amount-cell">{formatRiyal(getLoanComputedValues(row.original).total)}</span>
        },
        {
            id: 'raised_amount',
            accessorFn: (loan) => getLoanComputedValues(loan).raised,
            header: 'المبلغ المرفوع',
            cell: ({ row }) => {
                const value = getLoanComputedValues(row.original).raised;
                return <span className="amount amount-cell">{value > 0 ? formatRiyal(value) : '—'}</span>;
            }
        },
        {
            id: 'collected_amount',
            accessorFn: (loan) => getLoanComputedValues(loan).collected,
            header: 'المبلغ المحصل',
            cell: ({ row }) => {
                const value = getLoanComputedValues(row.original).collected;
                return <span className="amount amount-cell">{value > 0 ? formatRiyal(value) : '—'}</span>;
            }
        },
        {
            id: 'case_track',
            accessorFn: (loan) => getLoanComputedValues(loan).caseTrack ? 'case' : 'normal',
            header: 'المسار',
            cell: ({ row }) => {
                const inCaseTrack = getLoanComputedValues(row.original).caseTrack;
                return (
                    <span className={`status-badge status-track ${inCaseTrack ? 'status-overdue' : 'status-cancelled'}`}>
                        {inCaseTrack ? (row.original.status === 'Paid' ? 'كان بالقضايا' : 'بالقضايا') : 'عادي'}
                    </span>
                );
            }
        },
        {
            accessorKey: 'receipt_number',
            header: 'رقم السند',
            cell: ({ row }) => <span className="receipt-cell">{row.original.receipt_number || '-'}</span>
        },
        {
            accessorKey: 'status',
            header: 'الحالة',
            cell: ({ row }) => (
                <span className={`status-badge status-flat status-${String(row.original.status || '').toLowerCase()}`}>
                    {getLoanStatusLabel(row.original.status)}
                </span>
            )
        },
        {
            id: 'transaction_date',
            accessorFn: (loan) => new Date(loan.transaction_date || 0).getTime(),
            header: 'تاريخ المعاملة',
            cell: ({ row }) => (
                <span className="date-cell">
                    {row.original.transaction_date
                        ? new Date(row.original.transaction_date).toLocaleDateString('ar-SA')
                        : '—'}
                </span>
            )
        },
        {
            id: 'actions',
            header: 'الإجراءات',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="actions-wrap">
                    <div className="actions-block-title">إجراءات عامة</div>
                    <div className="icon-actions">
                        <button
                            className="btn-action btn-edit"
                            onClick={() => setEditingLoan(row.original)}
                            title="تعديل بيانات القرض"
                        >
                            <IconEdit size={15} />
                            <span>تعديل</span>
                        </button>

                        {row.original.whatsappLink && (
                            <a
                                href={row.original.whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-action btn-whatsapp"
                                title="تواصل واتساب مباشر"
                            >
                                <IconWhatsapp size={15} />
                                <span>واتساب</span>
                            </a>
                        )}

                        {row.original.national_id && (
                            <a
                                href="https://najiz.sa"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-action btn-najiz"
                                title="ناجز"
                            >
                                <IconScale size={15} />
                                <span>ناجز</span>
                            </a>
                        )}

                        <button
                            className="btn-action btn-delete"
                            onClick={() => handleDelete(row.original.id)}
                            title="حذف"
                        >
                            <IconTrash size={15} />
                            <span>حذف</span>
                        </button>
                    </div>
                    <div className="actions-block-title">تغيير الحالة</div>
                    <div className="state-actions">
                        <button
                            className="btn-action-label btn-raised"
                            onClick={() => handleStatusChange(row.original.id, 'Raised')}
                            disabled={row.original.status === 'Raised'}
                        >
                            تحويل إلى قضايا
                        </button>
                        <button
                            className="btn-action-label btn-paid"
                            onClick={() => handleStatusChange(row.original.id, 'Paid')}
                            disabled={row.original.status === 'Paid'}
                        >
                            تحويل إلى تم التسديد
                        </button>
                    </div>
                </div>
            )
        }
    ]), [handleDelete, handleStatusChange]);

    const loanFilters = useMemo<DataTableFilterConfig[]>(() => ([
        {
            columnId: 'status',
            label: 'الحالة',
            placeholder: 'كل الحالات',
            options: [
                { label: 'نشط', value: 'Active' },
                { label: 'تم التسديد', value: 'Paid' },
                { label: 'قضايا', value: 'Raised' },
                { label: 'ملغي', value: 'Cancelled' }
            ]
        },
        {
            columnId: 'case_track',
            label: 'المسار',
            placeholder: 'كل المسارات',
            options: [
                { label: 'بالقضايا', value: 'case' },
                { label: 'عادي', value: 'normal' }
            ]
        }
    ]), []);

    const loanBulkActions = useMemo<DataTableBulkAction<any>[]>(() => ([
        {
            id: 'bulk-raised',
            label: 'تحويل المحدد إلى قضايا',
            onClick: (rows) => handleBulkStatusChange(rows, 'Raised')
        },
        {
            id: 'bulk-paid',
            label: 'تحويل المحدد إلى تم التسديد',
            onClick: (rows) => handleBulkStatusChange(rows, 'Paid')
        },
        {
            id: 'bulk-delete',
            label: 'حذف المحدد',
            variant: 'danger',
            onClick: handleBulkDelete
        }
    ]), [handleBulkDelete, handleBulkStatusChange]);

    const loanExportMapper = useCallback((loan: any) => {
        const values = getLoanComputedValues(loan);
        return {
            'اسم العميل': loan.customer_name || '',
            'رقم الهوية': loan.national_id || '',
            'المبلغ الأساسي': values.principal,
            'المبلغ النهائي': values.total,
            'المبلغ المرفوع': values.raised,
            'المبلغ المحصل': values.collected,
            'المسار': values.caseTrack ? 'بالقضايا' : 'عادي',
            'رقم السند': loan.receipt_number || '',
            'الحالة': getLoanStatusLabel(loan.status),
            'تاريخ المعاملة': loan.transaction_date ? new Date(loan.transaction_date).toLocaleDateString('ar-SA') : ''
        };
    }, []);

    const renderLoanCard = useCallback((loan: any) => {
        const values = getLoanComputedValues(loan);
        return (
            <div className="actions">
                <div className="customer-main">{loan.customer_name}</div>
                <div className="customer-sub">{loan.national_id || '-'}</div>
                <div className="status-badge status-flat" style={{ marginTop: '8px' }}>
                    {getLoanStatusLabel(loan.status)}
                </div>
                <div style={{ display: 'grid', gap: '6px', marginTop: '10px', fontSize: '0.86rem' }}>
                    <div>المبلغ النهائي: <strong>{formatRiyal(values.total)}</strong></div>
                    <div>المبلغ المحصل: <strong>{values.collected > 0 ? formatRiyal(values.collected) : '—'}</strong></div>
                    <div>تاريخ المعاملة: <strong>{loan.transaction_date ? new Date(loan.transaction_date).toLocaleDateString('ar-SA') : '—'}</strong></div>
                </div>
                <div className="state-actions" style={{ marginTop: '10px' }}>
                    <button
                        className="btn-action-label btn-raised"
                        onClick={() => handleStatusChange(loan.id, 'Raised')}
                        disabled={loan.status === 'Raised'}
                    >
                        قضايا
                    </button>
                    <button
                        className="btn-action-label btn-paid"
                        onClick={() => handleStatusChange(loan.id, 'Paid')}
                        disabled={loan.status === 'Paid'}
                    >
                        تم التسديد
                    </button>
                </div>
            </div>
        );
    }, [handleStatusChange]);

    return (
        <div className="loans-page-container">
            <MoneyRain isRaining={showMoneyRain} onComplete={() => setShowMoneyRain(false)} />

            <div className="page-header">
                <h1>إدارة القروض</h1>
                <div className="header-actions">
                    <button className="btn-export" onClick={() => setShowImportModal(true)}>
                        <IconUpload className="btn-icon-inline" size={16} /> استيراد قروض
                    </button>
                    <button className="btn-export" onClick={handleExport}>
                        <IconDownload className="btn-icon-inline" size={16} /> تصدير Excel
                    </button>
                    <button className="btn-primary" onClick={() => router.push('/dashboard/loans/new')}>
                        <IconPlus className="btn-icon-inline" size={16} /> إضافة قرض جديد
                    </button>
                </div>
            </div>

            <div className="filters-section">
                <input
                    type="text"
                    placeholder="بحث بالاسم أو رقم الهوية..."
                    value={filters.search}
                    onChange={(e) => {
                        const next = e.target.value;
                        startTransition(() => setFilters({ ...filters, search: next }));
                    }}
                    className="search-input"
                />

                <select
                    value={filters.status}
                    onChange={(e) => {
                        const next = e.target.value;
                        startTransition(() => setFilters({ ...filters, status: next }));
                    }}
                    className="filter-select"
                >
                    <option value="">كل الحالات</option>
                    <option value="Active">نشط</option>
                    <option value="Paid">تم التسديد</option>
                    <option value="Raised">قضايا</option>
                    <option value="Cancelled">ملغي</option>
                </select>

                <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                        const next = e.target.value;
                        startTransition(() => setFilters({ ...filters, startDate: next }));
                    }}
                    className="date-input"
                />

                <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                        const next = e.target.value;
                        startTransition(() => setFilters({ ...filters, endDate: next }));
                    }}
                    className="date-input"
                />

                <button
                    className="btn-clear"
                    onClick={() => startTransition(() => setFilters({ search: '', status: '', startDate: '', endDate: '', delayed: false }))}
                >
                    مسح الفلاتر
                </button>
            </div>

            {loading ? (
                <TableSkeleton rows={8} columns={11} />
            ) : loadError && loans.length === 0 ? (
                <ErrorState
                    title="تعذر تحميل القروض"
                    description={loadError}
                    primaryAction={{
                        label: 'إعادة المحاولة',
                        onClick: () => {
                            setLoading(true);
                            fetchLoans(pagination.page, { forceFresh: true });
                        },
                    }}
                    secondaryAction={{
                        label: 'الإدخال السريع',
                        onClick: () => router.push('/dashboard/quick-entry'),
                    }}
                />
            ) : loans.length === 0 ? (
                <EmptyState
                    title={hasFiltersApplied ? 'لا توجد نتائج مطابقة' : 'لا توجد قروض مسجلة بعد'}
                    description={hasFiltersApplied
                        ? 'جرّب تعديل عوامل التصفية أو البحث لعرض نتائج أخرى.'
                        : 'ابدأ بإضافة أول قرض أو استورد ملف القروض للانطلاق بسرعة.'}
                    primaryAction={{
                        label: 'إضافة قرض جديد',
                        onClick: () => router.push('/dashboard/loans/new'),
                    }}
                    secondaryAction={hasFiltersApplied
                        ? {
                            label: 'مسح الفلاتر',
                            onClick: () => setFilters({ search: '', status: '', startDate: '', endDate: '', delayed: false }),
                        }
                        : {
                            label: 'استيراد قروض',
                            onClick: () => setShowImportModal(true),
                        }}
                />
            ) : (
                <>
                    <div className="loans-table-container">
                        <DataTablePro
                            data={loans}
                            columns={loanColumns}
                            filters={loanFilters}
                            bulkActions={loanBulkActions}
                            searchPlaceholder="بحث سريع داخل النتائج المعروضة..."
                            emptyLabel="لا توجد نتائج مطابقة في الجدول."
                            exportFilePrefix="loans-table"
                            exportMapper={loanExportMapper}
                            rowClassName={getLoanRowStateClass}
                            mobileCardRenderer={(loan) => renderLoanCard(loan)}
                            enableClientPagination={false}
                        />
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="btn btn-ghost"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                            >
                                السابق
                            </button>
                            {pageItems.map((item, idx) => (
                                item === 'ellipsis'
                                    ? <span key={`ellipsis-${idx}`} className="page-ellipsis">…</span>
                                    : (
                                        <button
                                            key={item}
                                            className={`btn btn-ghost page-number ${item === pagination.page ? 'active' : ''}`}
                                            onClick={() => setPagination({ ...pagination, page: item })}
                                        >
                                            {item}
                                        </button>
                                    )
                            ))}
                            <span>صفحة {pagination.page} من {pagination.totalPages}</span>
                            <button
                                className="btn btn-ghost"
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                            >
                                التالي
                            </button>
                        </div>
                    )}
                </>
            )}

            {editingLoan && <EditLoanModal loan={editingLoan} onClose={() => setEditingLoan(null)} onSuccess={async (updatedLoan?: any) => {
                setEditingLoan(null);
                if (updatedLoan?.id) {
                    setLoans((prev) => prev.map((loan) => (
                        loan.id === updatedLoan.id ? { ...loan, ...updatedLoan } : loan
                    )));
                }
                scheduleRefresh(700, true);
                appToast.success('تم تحديث بيانات القرض');
            }} />}
            {showImportModal && <ImportLoansModal onClose={() => setShowImportModal(false)} onSuccess={async () => {
                setShowImportModal(false);
                setShowMoneyRain(true);
                await fetchLoans(1);
                appToast.success('تم استيراد القروض وتحديث القائمة');
            }} />}

            {deleteLoanId && (
                <div className="modal-overlay" onClick={() => setDeleteLoanId(null)}>
                    <div className="modal-content glass-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>تأكيد حذف القرض</h2>
                            <button className="modal-close" onClick={() => setDeleteLoanId(null)}>×</button>
                        </div>
                        <p className="modal-hint">سيتم حذف القرض من القائمة، هل تريد المتابعة؟</p>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setDeleteLoanId(null)}>إلغاء</button>
                            <button type="button" className="btn-primary" onClick={confirmDelete}>تأكيد الحذف</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Modals ──────────────────────────────────────────

const ImportLoansModal = ({ onClose, onSuccess }: any) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const name = (f.name || '').toLowerCase();
        if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
            setMessage({ type: 'error', text: 'يرجى اختيار ملف CSV أو Excel (.csv, .xlsx, .xls)' });
            setFile(null);
            return;
        }
        setFile(f);
        setMessage({ type: '', text: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setMessage({ type: 'error', text: 'اختر ملفاً أولاً' });
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await loansAPI.upload(formData);
            const data = response.data || response;
            const summary = data.summary || {};
            setMessage({ type: 'success', text: `تم استيراد ${summary.success ?? 0} قرض بنجاح` });
            setTimeout(() => onSuccess(), 1500);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'فشل رفع الملف' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>استيراد قروض من ملف</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <p className="modal-hint">يدعم الملفات: CSV أو Excel (.xlsx, .xls). الأعمدة المتوقع: رقم الهوية/العميل، المبلغ، رقم السند، التاريخ.</p>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>الملف</label>
                        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
                        {file && <span className="file-name">{file.name}</span>}
                    </div>
                    {message.text && <div className={`${message.type}-message`}>{message.text}</div>}
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>إلغاء</button>
                        <button type="submit" className="btn-primary" disabled={loading || !file}>{loading ? 'جاري الرفع...' : 'استيراد'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddLoanModal = ({ onClose, onSuccess }: any) => {
    const [formData, setFormData] = useState({
        customerId: '',
        principal_amount: '',
        profit_percentage: INTEREST_OPTIONS[2] ?? INTEREST_OPTIONS[0],
        status: 'Active',
        receiptNumber: '',
        transactionDate: new Date().toISOString().split('T')[0],
        notes: '',
        najiz_case_number: '',
        najiz_case_amount: '',
        najiz_status: ''
    });
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await customersAPI.getAll({ limit: 100 });
            const data = response.data || response;
            setCustomers(data.customers || []);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                amount: ((parseFloat(String(formData.principal_amount)) || 0) * (1 + (parseFloat(String(formData.profit_percentage)) || 0) / 100)).toFixed(2)
            };
            await loansAPI.create(payload);
            onSuccess();
        } catch (error: any) {
            appToast.error(error?.response?.data?.error || 'فشل إضافة القرض');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>إضافة قرض جديد</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>العميل *</label>
                        <select required value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}>
                            <option value="">اختر العميل</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} - {c.national_id}</option>)}
                        </select>
                    </div>
                    <div className="form-group-row">
                        <div className="form-group">
                            <label>المبلغ الأساسي *</label>
                            <input type="number" required min="0" step="0.01" value={formData.principal_amount} onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ width: '120px' }}>
                            <label>نسبة الفائدة %</label>
                            <select
                                value={formData.profit_percentage}
                                onChange={(e) => setFormData({ ...formData, profit_percentage: Number(e.target.value) || 0 })}
                            >
                                {INTEREST_OPTIONS.map((rate) => (
                                    <option key={rate} value={rate}>{rate}%</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>المبلغ الإجمالي</label>
                        <input type="text" disabled value={((parseFloat(formData.principal_amount) || 0) * (1 + (formData.profit_percentage || 0) / 100)).toFixed(2) + ' ﷼'} className="input-highlight" />
                    </div>
                    <div className="form-group">
                        <label>الحالة</label>
                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                            <option value="Active">نشط</option>
                            <option value="Paid">مدفوع</option>
                            <option value="Raised">مرتفع (ناجز)</option>
                        </select>
                    </div>
                    {formData.status === 'Raised' && (
                        <div className="najiz-section">
                            <div className="form-group"><label>رقم القضية</label><input type="text" value={formData.najiz_case_number} onChange={(e) => setFormData({ ...formData, najiz_case_number: e.target.value })} /></div>
                            <div className="form-group"><label>حالة القضية</label><input type="text" value={formData.najiz_status} onChange={(e) => setFormData({ ...formData, najiz_status: e.target.value })} /></div>
                        </div>
                    )}
                    <div className="form-group"><label>رقم السند</label><input type="text" value={formData.receiptNumber} onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })} /></div>
                    <div className="form-group"><label>تاريخ المعاملة *</label><input type="date" required value={formData.transactionDate} onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })} /></div>
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>إلغاء</button>
                        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'جاري الحفظ...' : 'حفظ'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditLoanModal = ({ loan, onClose, onSuccess }: any) => {
    const [formData, setFormData] = useState({
        principal_amount: loan.principal_amount || loan.amount || '',
        profit_percentage: normalizeInterestRate(Number(loan.profit_percentage || 0)),
        status: loan.status || 'Active',
        receiptNumber: loan.receipt_number || '',
        transactionDate: loan.transaction_date ? new Date(loan.transaction_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        notes: loan.notes || '',
        najiz_case_number: loan.najiz_case_number || '',
        najiz_status: loan.najiz_status || ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                principal_amount: parseFloat(String(formData.principal_amount)) || 0,
                profit_percentage: Number(formData.profit_percentage) || 0,
                status: formData.status,
                receipt_number: formData.receiptNumber,
                transaction_date: formData.transactionDate,
                notes: formData.notes,
                najiz_case_number: formData.najiz_case_number,
                najiz_status: formData.najiz_status,
                amount: (
                    (parseFloat(String(formData.principal_amount)) || 0) *
                    (1 + (Number(formData.profit_percentage) || 0) / 100)
                ).toFixed(2)
            };
            const response: any = await loansAPI.update(loan.id, payload);
            const updatedLoan = response?.data?.loan || response?.loan || {
                ...loan,
                ...payload,
                amount: payload.amount,
                principal_amount: payload.principal_amount,
                profit_percentage: payload.profit_percentage,
                status: payload.status,
                receipt_number: payload.receipt_number,
                transaction_date: payload.transaction_date,
                notes: payload.notes,
                najiz_case_number: payload.najiz_case_number,
                najiz_status: payload.najiz_status
            };
            onSuccess(updatedLoan);
        } catch (error: any) {
            appToast.error(error?.response?.data?.error || 'فشل تعديل القرض');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>تعديل بيانات القرض</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group-row">
                        <div className="form-group">
                            <label>المبلغ الأساسي *</label>
                            <input type="number" required min="0" step="0.01" value={formData.principal_amount} onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ width: '120px' }}>
                            <label>نسبة الفائدة %</label>
                            <select
                                value={formData.profit_percentage}
                                onChange={(e) => setFormData({ ...formData, profit_percentage: Number(e.target.value) || 0 })}
                            >
                                {INTEREST_OPTIONS.map((rate) => (
                                    <option key={rate} value={rate}>{rate}%</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>الحالة</label>
                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                            <option value="Active">نشط</option>
                            <option value="Paid">مدفوع</option>
                            <option value="Raised">مرتفع (ناجز)</option>
                        </select>
                    </div>
                    <div className="form-group"><label>رقم السند</label><input type="text" value={formData.receiptNumber} onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })} /></div>
                    <div className="form-group"><label>تاريخ المعاملة *</label><input type="date" required value={formData.transactionDate} onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })} /></div>
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>إلغاء</button>
                        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoansPage;

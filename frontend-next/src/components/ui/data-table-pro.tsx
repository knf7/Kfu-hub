'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    ColumnDef,
    ColumnFiltersState,
    PaginationState,
    RowSelectionState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable
} from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import styles from './data-table-pro.module.css';

export type DataTableFilterOption = {
    label: string;
    value: string;
};

export type DataTableFilterConfig = {
    columnId: string;
    label: string;
    options: DataTableFilterOption[];
    placeholder?: string;
};

export type DataTableBulkAction<TData> = {
    id: string;
    label: string;
    variant?: 'default' | 'danger';
    onClick: (rows: TData[]) => void | Promise<void>;
};

type RecordLike = Record<string, unknown>;

type DataTableProProps<TData extends RecordLike, TValue> = {
    data: TData[];
    columns: Array<ColumnDef<TData, TValue>>;
    filters?: DataTableFilterConfig[];
    bulkActions?: Array<DataTableBulkAction<TData>>;
    searchPlaceholder?: string;
    emptyLabel?: string;
    exportFilePrefix?: string;
    exportMapper?: (row: TData) => RecordLike;
    enableGlobalSearch?: boolean;
    enableRowSelection?: boolean;
    enableClientPagination?: boolean;
    initialPageSize?: number;
    pageSizeOptions?: number[];
    rowClassName?: (row: TData) => string | undefined;
    mobileCardRenderer?: (row: TData, index: number) => React.ReactNode;
    onExportCSV?: (rows: TData[]) => void | Promise<void>;
    onExportExcel?: (rows: TData[]) => void | Promise<void>;
    getRowId?: (row: TData, index: number) => string;
};

const quoteCsvCell = (value: unknown) => {
    if (value === undefined || value === null) return '""';
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
};

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const defaultExportMapper = <TData extends RecordLike>(row: TData): RecordLike => (
    Object.entries(row).reduce<RecordLike>((acc, [key, value]) => {
        if (typeof value === 'object' && value !== null) {
            acc[key] = JSON.stringify(value);
            return acc;
        }
        acc[key] = value ?? '';
        return acc;
    }, {})
);

const getPageItems = (pageIndex: number, pageCount: number): Array<number | 'ellipsis'> => {
    if (pageCount <= 1) return [];
    const current = pageIndex + 1;
    const start = Math.max(1, current - 2);
    const end = Math.min(pageCount, current + 2);
    const items: Array<number | 'ellipsis'> = [];

    if (start > 1) {
        items.push(1);
        if (start > 2) items.push('ellipsis');
    }

    for (let i = start; i <= end; i += 1) items.push(i);

    if (end < pageCount) {
        if (end < pageCount - 1) items.push('ellipsis');
        items.push(pageCount);
    }

    return items;
};

export function DataTablePro<TData extends RecordLike, TValue>({
    data,
    columns,
    filters = [],
    bulkActions = [],
    searchPlaceholder = 'بحث سريع...',
    emptyLabel = 'لا توجد بيانات للعرض.',
    exportFilePrefix = 'data',
    exportMapper,
    enableGlobalSearch = true,
    enableRowSelection = true,
    enableClientPagination = true,
    initialPageSize = 10,
    pageSizeOptions = [10, 20, 50],
    rowClassName,
    mobileCardRenderer,
    onExportCSV,
    onExportExcel,
    getRowId
}: DataTableProProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [runningBulkActionId, setRunningBulkActionId] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: initialPageSize
    });

    useEffect(() => {
        if (!enableClientPagination) {
            setPagination({
                pageIndex: 0,
                pageSize: Math.max(data.length, 1)
            });
        }
    }, [data.length, enableClientPagination]);

    const resolvedColumns = useMemo(() => {
        if (!enableRowSelection) return columns;

        const selectionColumn: ColumnDef<TData, unknown> = {
            id: '__select',
            header: ({ table }) => (
                <input
                    type="checkbox"
                    className={styles.checkbox}
                    aria-label="تحديد كل الصفوف"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={(event) => table.toggleAllPageRowsSelected(event.target.checked)}
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    className={styles.checkbox}
                    aria-label="تحديد الصف"
                    checked={row.getIsSelected()}
                    onChange={(event) => row.toggleSelected(event.target.checked)}
                />
            ),
            enableSorting: false,
            enableHiding: false
        };

        return [selectionColumn, ...columns];
    }, [columns, enableRowSelection]);

    const table = useReactTable({
        data,
        columns: resolvedColumns,
        state: {
            sorting,
            columnFilters,
            rowSelection,
            globalFilter,
            pagination
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        enableRowSelection,
        getRowId: getRowId ?? ((row, index) => String((row as { id?: string | number }).id ?? index)),
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: 'includesString'
    });

    const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
    const filteredRows = table.getFilteredRowModel().rows.map((row) => row.original);
    const rowPoolForExport = selectedRows.length > 0 ? selectedRows : filteredRows;
    const pageIndex = table.getState().pagination.pageIndex;
    const pageCount = table.getPageCount();
    const pageItems = useMemo(() => getPageItems(pageIndex, pageCount), [pageCount, pageIndex]);
    const mapper = exportMapper ?? defaultExportMapper;

    const exportCSV = async () => {
        if (rowPoolForExport.length === 0) return;
        if (onExportCSV) {
            await onExportCSV(rowPoolForExport);
            return;
        }

        const mappedRows = rowPoolForExport.map(mapper);
        const headers = Array.from(
            mappedRows.reduce<Set<string>>((all, row) => {
                Object.keys(row).forEach((key) => all.add(key));
                return all;
            }, new Set<string>())
        );
        const csvLines = [
            headers.map((header) => quoteCsvCell(header)).join(','),
            ...mappedRows.map((row) => headers.map((key) => quoteCsvCell(row[key])).join(','))
        ];
        const csv = `\uFEFF${csvLines.join('\n')}`;
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${exportFilePrefix}-${Date.now()}.csv`);
    };

    const exportExcel = async () => {
        if (rowPoolForExport.length === 0) return;
        if (onExportExcel) {
            await onExportExcel(rowPoolForExport);
            return;
        }

        const mappedRows = rowPoolForExport.map(mapper);
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(mappedRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, `${exportFilePrefix}-${Date.now()}.xlsx`);
    };

    const runBulkAction = async (action: DataTableBulkAction<TData>) => {
        if (!selectedRows.length) return;
        setRunningBulkActionId(action.id);
        try {
            await action.onClick(selectedRows);
            table.resetRowSelection();
        } finally {
            setRunningBulkActionId(null);
        }
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.toolbar}>
                <div className={styles.toolbarStart}>
                    {enableGlobalSearch && (
                        <input
                            className={styles.searchInput}
                            placeholder={searchPlaceholder}
                            value={globalFilter}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                        />
                    )}
                    {filters.map((filter) => {
                        const column = table.getColumn(filter.columnId);
                        if (!column) return null;
                        return (
                            <select
                                key={filter.columnId}
                                className={styles.filterSelect}
                                aria-label={filter.label}
                                value={String(column.getFilterValue() ?? '')}
                                onChange={(event) => column.setFilterValue(event.target.value || undefined)}
                            >
                                <option value="">{filter.placeholder || `كل ${filter.label}`}</option>
                                {filter.options.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        );
                    })}
                </div>
                <div className={styles.toolbarEnd}>
                    <button
                        className={styles.ghostBtn}
                        type="button"
                        onClick={exportCSV}
                        disabled={rowPoolForExport.length === 0}
                    >
                        تصدير CSV
                    </button>
                    <button
                        className={styles.ghostBtn}
                        type="button"
                        onClick={exportExcel}
                        disabled={rowPoolForExport.length === 0}
                    >
                        تصدير Excel
                    </button>
                </div>
            </div>

            {enableRowSelection && (
                <div className={styles.bulkBar}>
                    <span className={styles.bulkInfo}>
                        {selectedRows.length > 0
                            ? `تم تحديد ${selectedRows.length} سجل`
                            : 'حدد سجلات لتفعيل الإجراءات الجماعية'}
                    </span>
                    <div className={styles.bulkActions}>
                        {bulkActions.map((action) => (
                            <button
                                key={action.id}
                                type="button"
                                className={cn(
                                    styles.bulkAction,
                                    action.variant === 'danger' && styles.bulkActionDanger
                                )}
                                disabled={selectedRows.length === 0 || Boolean(runningBulkActionId)}
                                onClick={() => runBulkAction(action)}
                            >
                                {runningBulkActionId === action.id ? 'جاري التنفيذ...' : action.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={() => table.resetRowSelection()}
                            disabled={selectedRows.length === 0}
                        >
                            إلغاء التحديد
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.tableWrap}>
                <div className={styles.tableScroller}>
                    <table className={styles.table}>
                        <thead className={styles.tableHead}>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const canSort = header.column.getCanSort();
                                        const sortState = header.column.getIsSorted();
                                        return (
                                            <th
                                                key={header.id}
                                                className={cn(styles.th, canSort && styles.thSortable)}
                                                onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                            >
                                                {header.isPlaceholder ? null : (
                                                    <span className={styles.thInner}>
                                                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                                                        {canSort && (
                                                            <span className={styles.sortMark}>
                                                                {sortState === 'asc'
                                                                    ? '▲'
                                                                    : sortState === 'desc'
                                                                        ? '▼'
                                                                        : '↕'}
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td className={styles.emptyCell} colSpan={resolvedColumns.length}>
                                        {emptyLabel}
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <tr key={row.id} className={cn(styles.row, rowClassName?.(row.original))}>
                                        {row.getVisibleCells().map((cell) => (
                                            <td
                                                key={cell.id}
                                                className={cn(
                                                    styles.td,
                                                    cell.column.id === '__select' && styles.selectionCell
                                                )}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={styles.mobileList}>
                {table.getRowModel().rows.length === 0 ? (
                    <div className={styles.mobileCard}>{emptyLabel}</div>
                ) : (
                    table.getRowModel().rows.map((row, index) => (
                        <div key={`mobile-${row.id}`} className={cn(styles.mobileCard, rowClassName?.(row.original))}>
                            {mobileCardRenderer ? mobileCardRenderer(row.original, index) : (
                                <div className={styles.mobileFallbackList}>
                                    {Object.entries(mapper(row.original)).slice(0, 6).map(([key, value]) => (
                                        <div key={key} className={styles.mobileFallbackRow}>
                                            <span className={styles.mobileFallbackKey}>{key}</span>
                                            <span className={styles.mobileFallbackValue}>{String(value ?? '')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {enableClientPagination && pageCount > 1 && (
                <div className={styles.pagination}>
                    <span className={styles.pageInfo}>
                        صفحة {pageIndex + 1} من {pageCount}
                    </span>

                    <div className={styles.paginationBtns}>
                        <button
                            type="button"
                            className={styles.pageBtn}
                            disabled={!table.getCanPreviousPage()}
                            onClick={() => table.previousPage()}
                        >
                            السابق
                        </button>

                        {pageItems.map((item, index) => (
                            item === 'ellipsis'
                                ? <span key={`ellipsis-${index}`} className={styles.pageInfo}>…</span>
                                : (
                                    <button
                                        type="button"
                                        key={`page-${item}`}
                                        onClick={() => table.setPageIndex(item - 1)}
                                        className={cn(
                                            styles.pageBtn,
                                            pageIndex + 1 === item && styles.activePageBtn
                                        )}
                                    >
                                        {item}
                                    </button>
                                )
                        ))}

                        <button
                            type="button"
                            className={styles.pageBtn}
                            disabled={!table.getCanNextPage()}
                            onClick={() => table.nextPage()}
                        >
                            التالي
                        </button>
                    </div>

                    <select
                        className={styles.filterSelect}
                        value={table.getState().pagination.pageSize}
                        onChange={(event) => table.setPageSize(Number(event.target.value))}
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                {size} / الصفحة
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}

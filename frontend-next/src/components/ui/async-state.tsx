'use client';

import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';

import { cn } from '@/lib/utils';
import styles from './async-state.module.css';

type StateAction = {
  label: string;
  onClick: () => void;
};

type StateBaseProps = {
  title: string;
  description: string;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
  className?: string;
};

function StateActions({ primaryAction, secondaryAction }: Pick<StateBaseProps, 'primaryAction' | 'secondaryAction'>) {
  if (!primaryAction && !secondaryAction) return null;

  return (
    <div className={styles.stateActions}>
      {primaryAction && (
        <button type="button" className={styles.actionPrimary} onClick={primaryAction.onClick}>
          {primaryAction.label}
        </button>
      )}
      {secondaryAction && (
        <button type="button" className={styles.actionSecondary} onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: StateBaseProps) {
  return (
    <div className={cn(styles.stateCard, className)}>
      <span className={cn(styles.stateIcon, styles.stateIconInfo)}>
        <Inbox size={22} />
      </span>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateText}>{description}</p>
      <StateActions primaryAction={primaryAction} secondaryAction={secondaryAction} />
    </div>
  );
}

export function ErrorState({
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: StateBaseProps) {
  return (
    <div className={cn(styles.stateCard, className)}>
      <span className={cn(styles.stateIcon, styles.stateIconError)}>
        <AlertTriangle size={22} />
      </span>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateText}>{description}</p>
      <StateActions
        primaryAction={
          primaryAction || {
            label: 'إعادة المحاولة',
            onClick: () => {},
          }
        }
        secondaryAction={secondaryAction}
      />
    </div>
  );
}

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export function TableSkeleton({ rows = 6, columns = 6, className }: TableSkeletonProps) {
  return (
    <div className={cn(styles.tableSkeleton, className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`sk-row-${rowIndex}`}
          className={styles.tableRow}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, colIndex) => (
            <span
              key={`sk-cell-${rowIndex}-${colIndex}`}
              className={cn(styles.tableCell, styles.skeletonPulse)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type DashboardSkeletonProps = {
  className?: string;
};

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={cn(styles.skeletonPage, className)} aria-label="جاري تحميل لوحة التحكم">
      <div className={cn(styles.skeletonHeader, styles.skeletonPulse)} />
      <div className={cn(styles.skeletonQuickEntry, styles.skeletonPulse)} />
      <div className={styles.skeletonStats}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`stat-${index}`} className={cn(styles.skeletonStat, styles.skeletonPulse)} />
        ))}
      </div>
      <div className={cn(styles.skeletonSection, styles.skeletonPulse)} />
      <div className={cn(styles.skeletonSection, styles.skeletonPulse)} />
    </div>
  );
}

export function InlineLoadingLabel({ label = 'جاري التحميل...' }: { label?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <Loader2 size={14} className="animate-spin" />
      <span>{label}</span>
    </span>
  );
}

export function RetryLabel({ label = 'إعادة المحاولة' }: { label?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <RefreshCw size={14} />
      <span>{label}</span>
    </span>
  );
}

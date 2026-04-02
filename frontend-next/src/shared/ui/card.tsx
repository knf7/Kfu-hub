import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { componentVariantTokens, designTokens } from '@/tokens/design-tokens';

const cardVariants = cva('flex flex-col text-slate-900 dark:text-slate-100', {
  variants: {
    variant: {
      surface: componentVariantTokens.card.surface,
      elevated: componentVariantTokens.card.elevated,
      interactive: componentVariantTokens.card.interactive,
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'surface',
    padding: 'md',
  },
});

type CardProps = React.ComponentProps<'div'> &
  VariantProps<typeof cardVariants>;

function Card({ className, variant, padding, style, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant, padding, className }))}
      style={{
        borderRadius: designTokens.radius.xl,
        boxShadow: variant === 'elevated' ? designTokens.shadow.md : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('grid gap-1.5 pb-4', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('text-lg font-extrabold tracking-tight', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-slate-500 dark:text-slate-400', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('ml-auto', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('grid gap-3', className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-footer" className={cn('mt-4 flex items-center', className)} {...props} />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
};

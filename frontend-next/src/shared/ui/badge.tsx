import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';
import { componentVariantTokens, designTokens } from '@/tokens/design-tokens';

const badgeVariants = cva(
  'inline-flex w-fit items-center justify-center border border-transparent px-2.5 py-1 text-xs font-bold',
  {
    variants: {
      variant: {
        default: componentVariantTokens.badge.info,
        secondary: componentVariantTokens.badge.neutral,
        destructive: componentVariantTokens.badge.danger,
        info: componentVariantTokens.badge.info,
        success: componentVariantTokens.badge.success,
        warning: componentVariantTokens.badge.warning,
        danger: componentVariantTokens.badge.danger,
        neutral: componentVariantTokens.badge.neutral,
        outline: 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200',
        ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800',
        link: 'text-sky-700 underline-offset-4 hover:underline dark:text-sky-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  };

function Badge({ className, variant, asChild = false, style, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span';
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, className }))}
      style={{ borderRadius: designTokens.radius.pill, ...style }}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

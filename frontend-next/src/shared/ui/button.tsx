import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';
import { componentVariantTokens, designTokens } from '@/tokens/design-tokens';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2',
  {
    variants: {
      variant: {
        default: componentVariantTokens.button.brand,
        brand: componentVariantTokens.button.brand,
        secondary: componentVariantTokens.button.secondary,
        destructive: componentVariantTokens.button.danger,
        ghost: componentVariantTokens.button.ghost,
        outline: componentVariantTokens.button.outline,
        link: 'text-sky-700 underline-offset-4 hover:underline dark:text-sky-300',
      },
      size: {
        default: 'h-10 px-4 text-sm',
        xs: 'h-7 px-2 text-xs',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-11 px-6 text-base',
        icon: 'size-10',
      },
      stretch: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      stretch: false,
    },
  }
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  stretch,
  asChild = false,
  style,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, stretch, className }))}
      style={{ borderRadius: designTokens.radius.md, ...style }}
      {...props}
    />
  );
}

export { Button, buttonVariants };

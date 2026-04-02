import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { componentVariantTokens, designTokens } from '@/tokens/design-tokens';

const inputVariants = cva(
  'w-full min-w-0 text-sm outline-none transition disabled:pointer-events-none disabled:opacity-60 placeholder:text-slate-400 dark:placeholder:text-slate-500',
  {
    variants: {
      variant: {
        default: componentVariantTokens.input.default,
        auth: componentVariantTokens.input.auth,
        filled: componentVariantTokens.input.filled,
      },
      inputSize: {
        sm: 'h-9 px-3',
        md: 'h-10 px-3.5',
        lg: 'h-11 px-4',
      },
      state: {
        default: 'focus-visible:ring-2 focus-visible:ring-sky-300 dark:focus-visible:ring-sky-800',
        invalid: 'border-red-400 ring-2 ring-red-200 dark:border-red-700 dark:ring-red-900/40',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
      state: 'default',
    },
  }
);

type InputProps = React.ComponentProps<'input'> &
  VariantProps<typeof inputVariants>;

function Input({ className, variant, inputSize, state, style, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      className={cn(inputVariants({ variant, inputSize, state, className }))}
      style={{ borderRadius: designTokens.radius.md, ...style }}
      {...props}
    />
  );
}

export { Input, inputVariants };

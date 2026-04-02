"use client";

import * as React from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast, Toaster as Sonner, type ToasterProps } from 'sonner';

import { componentVariantTokens, designTokens } from '@/tokens/design-tokens';

type ToastKind = 'success' | 'warning' | 'error' | 'info';

const toastClassMap: Record<ToastKind, string> = {
  success: componentVariantTokens.toast.success,
  warning: componentVariantTokens.toast.warning,
  error: componentVariantTokens.toast.error,
  info: componentVariantTokens.toast.info,
};

const baseToastClass =
  'border font-semibold shadow-sm backdrop-blur-sm dark:backdrop-blur';

export const appToast = {
  success: (message: string, description?: string) =>
    toast.success(message, {
      description,
      className: `${baseToastClass} ${toastClassMap.success}`,
    }),
  warning: (message: string, description?: string) =>
    toast.warning(message, {
      description,
      className: `${baseToastClass} ${toastClassMap.warning}`,
    }),
  error: (message: string, description?: string) =>
    toast.error(message, {
      description,
      className: `${baseToastClass} ${toastClassMap.error}`,
    }),
  info: (message: string, description?: string) =>
    toast.info(message, {
      description,
      className: `${baseToastClass} ${toastClassMap.info}`,
    }),
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': designTokens.radius.md,
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

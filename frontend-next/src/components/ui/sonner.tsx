"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast, Toaster as Sonner, type ToasterProps } from "sonner"

const baseToastClass =
  "border font-semibold shadow-sm backdrop-blur-sm dark:backdrop-blur"

const toastClassMap = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200",
  info: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
} as const

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
  loading: (message: string) =>
    toast.loading(message, {
      className: `${baseToastClass} ${toastClassMap.info}`,
    }),
  dismiss: (id?: string | number) => toast.dismiss(id),
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
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
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster, appToast }

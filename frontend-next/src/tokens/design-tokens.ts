export const designTokens = {
  color: {
    brand: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      900: '#0c4a6e',
    },
    success: '#0f766e',
    warning: '#d97706',
    danger: '#dc2626',
    neutral: {
      0: '#ffffff',
      50: '#f8fafc',
      100: '#f1f5f9',
      300: '#cbd5e1',
      500: '#64748b',
      700: '#334155',
      900: '#0f172a',
    },
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    pill: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
    md: '0 8px 24px rgba(15, 23, 42, 0.12)',
    lg: '0 18px 40px rgba(15, 23, 42, 0.16)',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  typography: {
    bodyWeight: 500,
    headingWeight: 800,
    strongWeight: 700,
  },
} as const;

export const componentVariantTokens = {
  button: {
    brand: 'bg-sky-600 text-white hover:bg-sky-700',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    outline: 'border border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800',
  },
  card: {
    surface: 'border border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-900/80',
    elevated: 'border border-sky-200/70 bg-white shadow-lg shadow-sky-100/60 dark:border-sky-900/40 dark:bg-slate-900',
    interactive: 'border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900',
  },
  input: {
    default: 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900/70',
    auth: 'border-slate-300 bg-slate-50 focus-visible:border-sky-400 dark:border-slate-600 dark:bg-slate-800/70',
    filled: 'border-transparent bg-slate-100 focus-visible:bg-white dark:bg-slate-800',
  },
  badge: {
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  toast: {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
    error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200',
    info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
  },
} as const;

import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   'bg-accent-500 text-white hover:bg-accent-600 active:scale-95 disabled:bg-sand-300 disabled:text-sand-500 focus:ring-accent-500',
  secondary: 'bg-white text-gray-800 border border-sand-300 hover:border-sand-400 hover:bg-sand-50 active:scale-95 disabled:text-sand-400 focus:ring-accent-300 dark:bg-night-200 dark:text-night-50 dark:border-night-100 dark:hover:border-night-100 dark:hover:bg-night-100',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:scale-95 disabled:bg-red-300 focus:ring-red-500',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

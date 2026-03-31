export function FormField({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

export const INPUT_CLS =
  'rounded-lg border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-1 focus:border-accent-400';

/** INPUT_CLS with border-red-500 for validation errors (uses !important to override border-sand-300). */
export const INPUT_ERR_CLS =
  'rounded-lg border !border-red-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-1 focus:border-accent-400';

/** Returns INPUT_CLS or INPUT_ERR_CLS based on whether the field has an error. */
export function inputCls(hasError: boolean): string {
  return hasError ? INPUT_ERR_CLS : INPUT_CLS;
}

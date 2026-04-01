import type { BagType } from '../../hooks/usePackingVisualization';

const BAG_OPTIONS: { value: BagType; label: string; icon: string }[] = [
  { value: 'suitcase',  label: 'Suitcase', icon: '🧳' },
  { value: 'backpack',  label: 'Backpack', icon: '🎒' },
  { value: 'duffel',    label: 'Duffel',   icon: '👜' },
];

interface BagSelectorProps {
  value: BagType;
  onChange: (bagType: BagType) => void;
  disabled?: boolean;
}

export function BagSelector({ value, onChange, disabled }: BagSelectorProps) {
  return (
    <div className="flex gap-1.5">
      {BAG_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={[
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
            value === opt.value
              ? 'border-accent-400 bg-accent-50 text-accent-700'
              : 'border-sand-200 bg-white dark:bg-night-200 dark:border-night-100 text-sand-500 dark:text-sand-400 hover:border-sand-300 dark:hover:border-night-100',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <span className="mr-1">{opt.icon}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

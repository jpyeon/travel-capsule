import { useState } from 'react';
import { Button } from './Button';

export interface Step {
  label: string;
  content: React.ReactNode;
  /** Return a validation error string, or null if valid */
  validate?: () => string | null;
}

interface StepFormProps {
  steps: Step[];
  onSubmit: () => Promise<void>;
  submitting?: boolean;
  /** Label for the final submit button. Defaults to "Create Trip". */
  submitLabel?: string;
}

export function StepForm({ steps, onSubmit, submitting = false, submitLabel = 'Create Trip' }: StepFormProps) {
  const [current, setCurrent] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  const isLast = current === steps.length - 1;

  function handleNext() {
    const error = steps[current].validate?.() ?? null;
    if (error) { setStepError(error); return; }
    setStepError(null);
    setCurrent((c) => c + 1);
  }

  function handleBack() {
    setStepError(null);
    setCurrent((c) => c - 1);
  }

  async function handleSubmit() {
    const error = steps[current].validate?.() ?? null;
    if (error) { setStepError(error); return; }
    setStepError(null);
    await onSubmit();
  }

  return (
    <div className="space-y-8">

      {/* Step indicators */}
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((step, i) => {
          const done    = i < current;
          const active  = i === current;
          const pending = i > current;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  active  ? 'bg-accent-500 text-white ring-2 ring-accent-200 ring-offset-1'  : '',
                  done    ? 'bg-accent-100 text-accent-700' : '',
                  pending ? 'bg-sand-100 text-sand-400' : '',
                ].join(' ')}
              >
                {done ? '✓' : i + 1}
              </span>
              <span
                className={[
                  'text-sm',
                  active  ? 'font-semibold text-gray-900' : '',
                  done    ? 'text-accent-600' : '',
                  pending ? 'text-sand-400' : '',
                ].join(' ')}
              >
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <span className="mx-2 text-sand-300 select-none">›</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-sand-200" />

      {/* Active step content */}
      <div className="space-y-4">
        {steps[current].content}
      </div>

      {/* Step error */}
      {stepError && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {stepError}
        </p>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={handleBack}
          disabled={current === 0 || submitting}
        >
          Back
        </Button>
        {isLast ? (
          <Button type="button" onClick={handleSubmit} loading={submitting}>
            {submitLabel}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext} disabled={submitting}>
            Next
          </Button>
        )}
      </div>

    </div>
  );
}

// packages/ui/hal/src/primitives/SegButton.tsx
export interface SegOption<T extends string> {
  value: T;
  label: string;
}

export interface SegButtonProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegOption<T>>;
}

export function SegButton<T extends string>({ value, onChange, options }: SegButtonProps<T>) {
  return (
    <div
      role="radiogroup"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        border: '1px solid var(--hal-line-1)',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '7px 6px',
              fontSize: 11,
              color: active ? 'var(--hal-bg-0)' : 'var(--hal-text-1)',
              background: active ? 'var(--hal-a)' : 'var(--hal-bg-2)',
              fontWeight: active ? 600 : 400,
              borderLeft: i > 0 ? '1px solid var(--hal-line-1)' : 'none',
              cursor: 'pointer',
              fontFamily: 'var(--hal-sans)',
              transition: 'all 0.1s',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

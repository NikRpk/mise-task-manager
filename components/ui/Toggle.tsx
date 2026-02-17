'use client';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  labelPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  labelPosition = 'right',
  size = 'md',
}: ToggleProps) {
  // Size configurations
  const sizes = {
    sm: {
      track: 'h-5 w-9',
      knob: 'h-4 w-4',
      translateOn: 'translateX(16px)',
      translateOff: 'translateX(2px)',
    },
    md: {
      track: 'h-6 w-11',
      knob: 'h-5 w-5',
      translateOn: 'translateX(22px)',
      translateOff: 'translateX(2px)',
    },
    lg: {
      track: 'h-7 w-14',
      knob: 'h-6 w-6',
      translateOn: 'translateX(28px)',
      translateOff: 'translateX(2px)',
    },
  };

  const config = sizes[size];

  const ToggleSwitch = (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex ${config.track} items-center rounded-full transition-all duration-200 ease-in-out ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-90'
      }`}
      style={{
        backgroundColor: checked ? 'var(--color-primary)' : '#cbd5e1',
        boxShadow: checked ? '0 0 0 2px rgba(0, 166, 28, 0.1)' : 'none',
      }}
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <span
        className={`inline-block ${config.knob} transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out`}
        style={{
          transform: checked ? config.translateOn : config.translateOff,
        }}
      />
    </div>
  );

  if (!label) {
    return ToggleSwitch;
  }

  return (
    <label
      className={`flex items-center gap-2 ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } select-none`}
    >
      {labelPosition === 'left' && (
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </span>
      )}
      {ToggleSwitch}
      {labelPosition === 'right' && (
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
}

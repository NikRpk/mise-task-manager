'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      icon,
      iconPosition = 'left',
      disabled,
      children,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    // Size classes
    const sizeClasses = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    // Icon sizes
    const iconSizes = {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
    };

    // Base styles
    const baseStyles: React.CSSProperties = {
      borderRadius: '6px',
      fontWeight: 500,
      transition: 'all 0.2s ease',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: icon ? '0.5rem' : undefined,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.5 : 1,
      width: fullWidth ? '100%' : undefined,
      ...style,
    };

    // Variant styles
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: 'var(--color-primary)',
        color: 'white',
        border: 'none',
      },
      secondary: {
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)',
      },
      danger: {
        backgroundColor: '#f30047',
        color: 'white',
        border: 'none',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--color-text)',
        border: 'none',
      },
      outline: {
        backgroundColor: 'transparent',
        color: 'var(--color-primary)',
        border: '1px solid var(--color-primary)',
      },
    };

    const combinedStyles = {
      ...baseStyles,
      ...variantStyles[variant],
    };

    const iconSize = iconSizes[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${sizeClasses[size]} ${className} hover:opacity-90 active:scale-95 transition-all`}
        style={combinedStyles}
        {...props}
      >
        {loading && (
          <Loader2 size={iconSize} className="animate-spin" />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span className="flex items-center" style={{ fontSize: iconSize }}>
            {icon}
          </span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span className="flex items-center" style={{ fontSize: iconSize }}>
            {icon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

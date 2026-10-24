import React from 'react';

/**
 * Reusable Badge component for product tags and status indicators
 * Variants: default | accent | dark | outline | sale
 * Sizes: sm | md
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold uppercase tracking-widest transition-colors';

  const variantStyles = {
    default: 'bg-brand-cream text-brand-charcoal',
    accent: 'bg-brand-accent-light text-brand-accent border border-brand-accent/20',
    dark: 'bg-brand-black text-white',
    outline: 'border border-brand-border text-brand-muted bg-brand-surface',
    sale: 'bg-rose-50 text-rose-700 border border-rose-200',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.default} ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

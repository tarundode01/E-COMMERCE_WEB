import React from 'react';

/**
 * Premium reusable Button component
 * Variants: primary | accent | secondary | outline | ghost
 * Sizes: sm | md | lg
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  type = 'button',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none rounded-none';

  const variantStyles = {
    primary:
      'bg-brand-black text-white hover:bg-brand-charcoal dark:bg-brand-accent dark:text-neutral-950 dark:hover:bg-brand-accent-hover focus:ring-brand-accent shadow-sm font-semibold',
    accent:
      'bg-brand-accent text-white dark:text-neutral-950 hover:bg-brand-accent-hover focus:ring-brand-accent shadow-sm font-semibold',
    secondary:
      'bg-brand-cream text-brand-black dark:bg-[#1E212B] dark:text-[#F8F9FA] hover:bg-brand-border dark:hover:bg-[#282B37] focus:ring-brand-border',
    outline:
      'border border-brand-charcoal dark:border-[#3A3E4D] text-brand-charcoal dark:text-[#E5E7EB] hover:bg-brand-black hover:text-white dark:hover:bg-brand-accent dark:hover:text-neutral-950 dark:hover:border-brand-accent focus:ring-brand-accent',
    ghost:
      'text-brand-charcoal dark:text-[#E5E7EB] hover:bg-brand-cream/60 dark:hover:bg-[#1E212B] focus:ring-brand-border',
  };

  const sizeStyles = {
    sm: 'text-xs tracking-wider uppercase px-3.5 py-2 gap-1.5',
    md: 'text-sm tracking-wider uppercase px-5 py-2.5 gap-2',
    lg: 'text-base tracking-wider uppercase px-7 py-3.5 gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          ></path>
        </svg>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
        </>
      )}
    </button>
  );
}

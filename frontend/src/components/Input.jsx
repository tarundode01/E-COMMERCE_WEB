import React from 'react';

/**
 * Reusable Input component with label, error states, and icon support
 */
export default function Input({
  label,
  placeholder = '',
  error,
  helperText,
  icon: Icon,
  iconPosition = 'left',
  rightAction,
  id,
  type = 'text',
  className = '',
  required = false,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal mb-1.5"
        >
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
            <Icon size={18} />
          </div>
        )}

        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-brand-surface text-brand-black placeholder:text-brand-subtle text-sm px-3.5 py-2.5 transition-colors duration-150 border focus:outline-none ${
            Icon && iconPosition === 'left' ? 'pl-10' : ''
          } ${
            rightAction || (Icon && iconPosition === 'right') ? 'pr-10' : ''
          } ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
              : 'border-brand-border focus:border-brand-black focus:ring-1 focus:ring-brand-black'
          } ${className}`}
          {...props}
        />

        {rightAction ? (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightAction}
          </div>
        ) : Icon && iconPosition === 'right' ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-brand-muted">
            <Icon size={18} />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-rose-500">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-brand-muted">{helperText}</p>
      ) : null}
    </div>
  );
}

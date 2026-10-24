import React from 'react';

/**
 * Reusable Container component for layout consistency
 * Sizes: sm (narrow/forms) | default (standard) | wide (large grids) | full
 */
export default function Container({
  children,
  size = 'default',
  className = '',
  ...props
}) {
  const sizeStyles = {
    sm: 'max-w-3xl',
    default: 'max-w-7xl',
    wide: 'max-w-[1440px]',
    full: 'max-w-full',
  };

  return (
    <div
      className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${sizeStyles[size] || sizeStyles.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

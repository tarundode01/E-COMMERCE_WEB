import React from 'react';

/**
 * Reusable SectionHeading component with luxury typography
 * Props: title, subtitle, badge, align ('left' | 'center' | 'right')
 */
export default function SectionHeading({
  title,
  subtitle,
  badge,
  align = 'center',
  className = '',
  serif = true,
  ...props
}) {
  const alignStyles = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  return (
    <div
      className={`flex flex-col mb-10 md:mb-14 ${alignStyles[align] || alignStyles.center} ${className}`}
      {...props}
    >
      {badge && (
        <span className="text-xs uppercase font-semibold tracking-widest text-brand-accent mb-2.5">
          {badge}
        </span>
      )}

      {title && (
        <h2
          className={`text-2xl sm:text-3xl md:text-4xl text-brand-black leading-tight tracking-tight ${serif ? 'font-serif' : 'font-sans font-bold'
            }`}
        >
          {title}
        </h2>
      )}

      {/* Decorative accent divider */}
      <div className="w-12 h-0.5 bg-brand-accent my-3.5 opacity-80" />

      {subtitle && (
        <p className="text-sm sm:text-base text-brand-muted max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}




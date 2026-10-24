import React from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import Container from './Container';
import Button from './Button';
import defaultHeroImg from '../assets/hero_lifestyle.jpg';

/**
 * SafeLink helper: Uses React Router's <Link> if running within a Router context,
 * otherwise falls back to standard <a> tag.
 */
function SafeLink({ to, children, className, ...props }) {
  const hasRouter = useInRouterContext();

  if (hasRouter) {
    return (
      <Link to={to} className={className} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  );
}

/**
 * Premium HeroSection Component
 * Features:
 * - Headline: "Discover Your Style"
 * - Supporting text celebrating artisanal quality
 * - Primary Action: "Shop Now"
 * - Secondary Action: "Explore Collection"
 * - Editorial lifestyle photography with subtle luxury badge
 * - Generous spacing, responsive split layout, and warm off-white luxury palette
 */
export default function HeroSection({
  headline = 'Discover Your Style',
  subheading = 'Indulge in meticulously crafted pieces designed to elevate your everyday presence. From signature wardrobe staples to artisan accessories, experience timeless sophistication made with uncompromising quality.',
  primaryCtaText = 'Shop Now',
  primaryCtaLink = '/shop',
  secondaryCtaText = 'Explore Collection',
  secondaryCtaLink = '/categories',
  image = defaultHeroImg,
  tagline = 'Autumn / Winter Collection 2026',
}) {
  return (
    <section className="relative overflow-hidden bg-brand-offwhite py-12 sm:py-16 md:py-24 border-b border-brand-border/60">
      {/* Background Decorative Gradient Glow */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-brand-cream/40 rounded-full blur-2xl pointer-events-none" />

      <Container size="default">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Text Content (Cols 1 to 7) */}
          <div className="lg:col-span-7 flex flex-col items-start text-left z-10">
            {/* Tagline / Subtitle Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-cream/80 border border-brand-border/80 rounded-full mb-6">
              <Sparkles size={14} className="text-brand-accent" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-charcoal">
                {tagline}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-brand-black leading-[1.08] mb-6">
              {headline}
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-brand-muted leading-relaxed max-w-xl font-normal mb-8 sm:mb-10">
              {subheading}
            </p>

            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <SafeLink to={primaryCtaLink} className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto justify-center shadow-md hover:shadow-lg transition-all group"
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  {primaryCtaText}
                </Button>
              </SafeLink>

              <SafeLink to={secondaryCtaLink} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto justify-center hover:bg-brand-surface"
                >
                  {secondaryCtaText}
                </Button>
              </SafeLink>
            </div>

            {/* Trust Highlights */}
            <div className="mt-12 sm:mt-14 pt-8 border-t border-brand-border/60 w-full grid grid-cols-3 gap-4 sm:gap-8">
              <div>
                <p className="font-serif text-xl sm:text-2xl font-bold text-brand-black">100%</p>
                <p className="text-xs uppercase tracking-wider text-brand-muted mt-0.5">Artisan Crafted</p>
              </div>
              <div>
                <p className="font-serif text-xl sm:text-2xl font-bold text-brand-black">200+</p>
                <p className="text-xs uppercase tracking-wider text-brand-muted mt-0.5">Exclusive Styles</p>
              </div>
              <div>
                <p className="font-serif text-xl sm:text-2xl font-bold text-brand-black">Global</p>
                <p className="text-xs uppercase tracking-wider text-brand-muted mt-0.5">Express Delivery</p>
              </div>
            </div>
          </div>

          {/* Visual Showcase (Cols 8 to 12) */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md lg:max-w-none group">
              {/* Decorative Luxury Frame Shadow / Border */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-brand-accent/20 to-brand-cream/60 rounded-sm -rotate-1 group-hover:rotate-0 transition-transform duration-500 ease-out" />

              {/* Main Image Container */}
              <div className="relative overflow-hidden bg-brand-surface shadow-2xl border border-brand-border/80">
                <img
                  src={image}
                  alt="Premium Luxury Fashion & Lifestyle Editorial"
                  className="w-full h-[460px] sm:h-[540px] lg:h-[580px] object-cover object-top transform transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="eager"
                />

                {/* Bottom Overlay Pill */}
                <div className="absolute bottom-5 left-5 right-5 p-4 bg-brand-surface/90 backdrop-blur-md border border-white/60 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] tracking-widest uppercase text-brand-accent font-semibold">
                        Curated Editorial
                      </p>
                      <p className="text-sm font-serif font-bold text-brand-black">
                        Cashmere & Fine Leather
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-brand-charcoal bg-brand-cream px-2.5 py-1 uppercase tracking-wider">
                      Handpicked
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

import React from 'react';

/**
 * Atomic Shimmer Box element with luxury golden-light sweep animation
 */
export function Shimmer({ className = '', rounded = 'rounded-md', ...props }) {
  return (
    <div
      className={`shimmer-box ${rounded} ${className}`}
      {...props}
    />
  );
}

/**
 * Product Card Skeleton
 * Accurately replicates the dimensions and layout of ProductCard.jsx
 */
export function ProductCardSkeleton({ className = '' }) {
  return (
    <div
      className={`bg-brand-surface border border-brand-border/70 rounded-2xl overflow-hidden shadow-xs flex flex-col transition-all ${className}`}
    >
      {/* Product Image Placeholder */}
      <div className="relative aspect-square w-full bg-brand-border/30 overflow-hidden">
        <Shimmer className="w-full h-full rounded-none" />
        {/* Floating Tag Placeholder */}
        <div className="absolute top-3 left-3">
          <Shimmer className="h-5 w-16 rounded-full" />
        </div>
        {/* Wishlist Button Placeholder */}
        <div className="absolute top-3 right-3">
          <Shimmer className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Product Info Placeholder */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Category Tag */}
          <Shimmer className="h-3 w-20 rounded" />
          {/* Title (2 lines) */}
          <Shimmer className="h-4.5 w-11/12 rounded" />
          <Shimmer className="h-4.5 w-3/5 rounded" />

          {/* Rating Stars Placeholder */}
          <div className="flex items-center gap-1.5 pt-1">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Shimmer key={i} className="h-3.5 w-3.5 rounded-sm" />
              ))}
            </div>
            <Shimmer className="h-3 w-10 rounded ml-1" />
          </div>
        </div>

        {/* Pricing and Add-to-Cart Row */}
        <div className="pt-3 border-t border-brand-border/50 flex items-center justify-between">
          <div className="space-y-1">
            <Shimmer className="h-5 w-20 rounded" />
            <Shimmer className="h-3 w-14 rounded" />
          </div>
          <Shimmer className="h-9 w-9 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Product Grid Skeleton
 * Replicates the responsive grid used in Home, Shop, and Wishlist
 */
export function ProductGridSkeleton({ count = 8, cols = 4 }) {
  const colClass =
    cols === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : cols === 4
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${colClass} gap-6 sm:gap-7`}>
      {[...Array(count)].map((_, idx) => (
        <ProductCardSkeleton key={idx} />
      ))}
    </div>
  );
}

/**
 * Product Details Page Skeleton
 * Full luxury layout matching ProductDetails.jsx
 */
export function ProductDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-brand-offwhite py-10 sm:py-14 animate-fade-in-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb shimmer */}
        <div className="flex items-center gap-2 mb-8">
          <Shimmer className="h-3.5 w-14 rounded" />
          <span className="text-brand-border">/</span>
          <Shimmer className="h-3.5 w-20 rounded" />
          <span className="text-brand-border">/</span>
          <Shimmer className="h-3.5 w-36 rounded" />
        </div>

        {/* 2-Column Hero Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Left: Gallery Skeleton (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="aspect-square w-full rounded-2xl overflow-hidden border border-brand-border/70 bg-brand-surface shadow-xs">
              <Shimmer className="w-full h-full rounded-none" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-brand-border/60">
                  <Shimmer className="w-full h-full rounded-none" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Product Info Skeleton (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <Shimmer className="h-5 w-28 rounded-full" />
              <Shimmer className="h-9 w-4/5 rounded-lg" />
              <Shimmer className="h-9 w-3/5 rounded-lg" />

              {/* Stars & Reviews */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Shimmer key={i} className="h-4 w-4 rounded-sm" />
                  ))}
                </div>
                <Shimmer className="h-4 w-32 rounded" />
              </div>

              {/* Price Row */}
              <div className="flex items-center gap-4 py-3 border-y border-brand-border/60">
                <Shimmer className="h-8 w-28 rounded-md" />
                <Shimmer className="h-5 w-20 rounded-md" />
                <Shimmer className="h-5 w-16 rounded-full" />
              </div>

              {/* Description Paragraph */}
              <div className="space-y-2 pt-2">
                <Shimmer className="h-3.5 w-full rounded" />
                <Shimmer className="h-3.5 w-11/12 rounded" />
                <Shimmer className="h-3.5 w-4/5 rounded" />
              </div>

              {/* Sizes / Options */}
              <div className="space-y-2 pt-4">
                <Shimmer className="h-3.5 w-24 rounded" />
                <div className="flex gap-2">
                  {[...Array(4)].map((_, i) => (
                    <Shimmer key={i} className="h-9 w-16 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>

            {/* Quantity and Actions */}
            <div className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <Shimmer className="h-12 w-32 rounded-xl" />
                <Shimmer className="h-12 flex-1 rounded-xl" />
                <Shimmer className="h-12 w-12 rounded-xl" />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-4">
                {[...Array(3)].map((_, i) => (
                  <Shimmer key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Category Card Skeleton
 * For Categories.jsx page
 */
export function CategoryCardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {[...Array(count)].map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl overflow-hidden bg-brand-surface border border-brand-border/60 shadow-xs flex flex-col"
        >
          {/* Image */}
          <div className="aspect-16/11 w-full overflow-hidden bg-brand-border/30">
            <Shimmer className="w-full h-full rounded-none" />
          </div>
          {/* Content */}
          <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <Shimmer className="h-3.5 w-24 rounded" />
              <Shimmer className="h-6 w-3/4 rounded-md" />
              <Shimmer className="h-3.5 w-full rounded" />
              <Shimmer className="h-3.5 w-4/5 rounded" />
            </div>
            <div className="pt-4 border-t border-brand-border/40 flex items-center justify-between">
              <Shimmer className="h-4 w-28 rounded" />
              <Shimmer className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Order Card Skeleton
 * For Orders.jsx page
 */
export function OrderCardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {[...Array(count)].map((_, idx) => (
        <div
          key={idx}
          className="bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-border/60">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Shimmer className="h-4 w-32 rounded" />
                <Shimmer className="h-4 w-16 rounded-full" />
              </div>
              <Shimmer className="h-3 w-44 rounded" />
            </div>
            <div className="flex items-center gap-3">
              <Shimmer className="h-5 w-24 rounded" />
              <Shimmer className="h-8 w-24 rounded-lg" />
            </div>
          </div>

          {/* Items Row */}
          <div className="flex items-center gap-4">
            <Shimmer className="h-16 w-16 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Shimmer className="h-4 w-3/5 rounded" />
              <Shimmer className="h-3 w-1/4 rounded" />
            </div>
            <Shimmer className="h-5 w-20 rounded" />
          </div>

          {/* Footer Timeline / Info */}
          <div className="pt-3 border-t border-brand-border/40 flex items-center justify-between">
            <Shimmer className="h-3.5 w-48 rounded" />
            <Shimmer className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table Shimmer Skeleton
 * For Admin & Vendor tables (Products, Orders, Customers)
 */
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full bg-brand-surface rounded-2xl border border-brand-border/70 overflow-hidden shadow-xs">
      {/* Table Header */}
      <div className="bg-brand-cream/50 px-6 py-4 border-b border-brand-border/70 flex items-center gap-4">
        {[...Array(cols)].map((_, i) => (
          <Shimmer key={i} className="h-3.5 flex-1 rounded" />
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-brand-border/50">
        {[...Array(rows)].map((_, rowIdx) => (
          <div key={rowIdx} className="px-6 py-4 flex items-center gap-4">
            {/* First col with image thumbnail if first */}
            <div className="flex items-center gap-3 flex-1">
              <Shimmer className="h-10 w-10 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Shimmer className="h-3.5 w-3/4 rounded" />
                <Shimmer className="h-2.5 w-1/2 rounded" />
              </div>
            </div>
            {[...Array(cols - 1)].map((_, colIdx) => (
              <Shimmer key={colIdx} className="h-3.5 flex-1 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full Page Transition Shimmer Screen
 * Used on root auth loading or heavy data hydration
 */
export function FullPageShimmer() {
  return (
    <div className="min-h-screen bg-brand-offwhite flex flex-col antialiased">
      {/* Navbar Placeholder */}
      <header className="h-18 bg-brand-surface border-b border-brand-border/70 px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Shimmer className="h-8 w-36 rounded-lg" />
          <div className="hidden md:flex items-center gap-6">
            <Shimmer className="h-3.5 w-16 rounded" />
            <Shimmer className="h-3.5 w-16 rounded" />
            <Shimmer className="h-3.5 w-20 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-8 w-24 rounded-lg" />
        </div>
      </header>

      {/* Hero Banner Shimmer */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="h-64 sm:h-80 w-full rounded-3xl overflow-hidden border border-brand-border/70 bg-brand-surface shadow-xs p-8 flex flex-col justify-center space-y-4">
          <Shimmer className="h-4 w-28 rounded-full" />
          <Shimmer className="h-10 w-2/3 max-w-lg rounded-xl" />
          <Shimmer className="h-4 w-1/2 max-w-md rounded" />
          <div className="pt-2 flex gap-3">
            <Shimmer className="h-10 w-32 rounded-xl" />
            <Shimmer className="h-10 w-28 rounded-xl" />
          </div>
        </div>

        {/* Product Grid Shimmer */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Shimmer className="h-3.5 w-24 rounded" />
              <Shimmer className="h-6 w-48 rounded" />
            </div>
            <Shimmer className="h-8 w-28 rounded-lg" />
          </div>
          <ProductGridSkeleton count={8} cols={4} />
        </div>
      </div>
    </div>
  );
}

export default {
  Shimmer,
  ProductCardSkeleton,
  ProductGridSkeleton,
  ProductDetailsSkeleton,
  CategoryCardSkeleton,
  OrderCardSkeleton,
  TableSkeleton,
  FullPageShimmer,
};

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Layers,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Compass
} from 'lucide-react';
import Container from '../components/Container';
import SectionHeading from '../components/SectionHeading';
import Button from '../components/Button';
import { categoryService } from '../services/api';
import watchImg from '../assets/luxury_watch.jpg';
import bagImg from '../assets/luxury_bag.jpg';
import perfumeImg from '../assets/luxury_perfume.jpg';
import eyewearImg from '../assets/luxury_sunglasses.jpg';
import lifestyleImg from '../assets/hero_lifestyle.jpg';

const defaultCategoryPresets = [
  {
    _id: 'cat-horology',
    name: 'Luxury Horology',
    description: 'Precision Swiss chronometers and heirloom automatic timepieces.',
    image: watchImg,
  },
  {
    _id: 'cat-leather',
    name: 'Handcrafted Goods',
    description: 'Artisanal Tuscan full-grain leather bags and bespoke accessories.',
    image: bagImg,
  },
  {
    _id: 'cat-fragrance',
    name: 'Fine Fragrance',
    description: 'Haute perfumery crafted with rare botanicals and pure ambers.',
    image: perfumeImg,
  },
  {
    _id: 'cat-eyewear',
    name: 'Designer Eyewear',
    description: 'Hand-sculpted Japanese titanium frames dipped in 24k gold.',
    image: eyewearImg,
  },
  {
    _id: 'cat-couture',
    name: 'Haute Couture',
    description: 'Pure Mongolian double-faced cashmere and signature apparel.',
    image: lifestyleImg,
  },
];

export default function Categories() {
  const [categories, setCategories] = useState(defaultCategoryPresets);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Manual re-fetch function
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await categoryService.getCategories();
      if (data && data.success && Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories(data.categories);
      } else {
        setCategories(defaultCategoryPresets);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      // Fallback to presets rather than showing blocking error
      setCategories(defaultCategoryPresets);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-black py-12 sm:py-16 antialiased">
      <Container size="default">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER */}
        {/* ========================================================================= */}
        <SectionHeading
          badge="Curated Collections"
          title="Explore Categories"
          subtitle="Discover our meticulously curated collections crafted by world-renowned artisans, master horologists, and heritage ateliers."
          align="center"
        />

        {/* ========================================================================= */}
        {/* 2. ERROR STATE */}
        {/* ========================================================================= */}
        {error && (
          <div className="max-w-2xl mx-auto mb-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-left shadow-xs">
            <div className="flex items-start gap-3.5">
              <AlertTriangle size={22} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <h4 className="font-serif font-bold text-rose-900 text-base">
                  Unable to Load Categories
                </h4>
                <p className="text-xs text-rose-800 leading-relaxed">
                  {error}
                </p>
                <div className="pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={RefreshCw}
                    onClick={fetchCategories}
                    className="text-xs border-rose-300 text-rose-900 hover:bg-rose-100 cursor-pointer"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. LOADING SKELETON STATE */}
        {/* ========================================================================= */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="rounded-2xl overflow-hidden bg-brand-surface border border-brand-border/60 shadow-xs animate-pulse"
              >
                <div className="aspect-16/11 bg-brand-cream/60 w-full" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-brand-border/60 rounded w-1/3" />
                  <div className="h-6 bg-brand-border/60 rounded w-3/4" />
                  <div className="h-3.5 bg-brand-border/50 rounded w-full" />
                  <div className="h-3.5 bg-brand-border/50 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. EMPTY CATEGORIES STATE */}
        {/* ========================================================================= */}
        {!isLoading && !error && categories.length === 0 && (
          <div className="max-w-md mx-auto py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-cream border border-brand-border mx-auto flex items-center justify-center text-brand-muted">
              <Layers size={28} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-brand-black">
                No Categories Listed Yet
              </h3>
              <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                Our curators are currently preparing new luxury collection segments. In the meantime, explore all available items in the shop.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/shop">
                <Button variant="primary" size="md" icon={ShoppingBag}>
                  Explore All Products
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. CATEGORIES IMAGE CARDS GRID */}
        {/* ========================================================================= */}
        {!isLoading && !error && categories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 text-left">
            {categories.map((category) => {
              const targetCategory = category.name;
              const shopUrl = `/shop?category=${encodeURIComponent(targetCategory)}`;

              return (
                <Link
                  key={category.id || category._id}
                  to={shopUrl}
                  className="group relative rounded-2xl overflow-hidden border border-brand-border/70 bg-brand-surface shadow-xs hover:shadow-xl hover:border-brand-accent/50 transition-all duration-300 flex flex-col justify-end min-h-[340px] sm:min-h-[380px]"
                >
                  {/* Background Hero Image with Zoom Hover */}
                  <div className="absolute inset-0 z-0 overflow-hidden bg-brand-charcoal">
                    <img
                      src={category.image || watchImg}
                      alt={category.name}
                      className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
                      onError={(e) => {
                        e.target.src = watchImg;
                      }}
                    />
                    {/* Multi-layer luxury dark overlay for text contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10 group-hover:via-black/50 transition-colors" />
                  </div>

                  {/* Top Badge Overlay */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-black/40 text-brand-accent backdrop-blur-xs border border-white/10 group-hover:border-brand-accent/40 transition-colors">
                      Collection
                    </span>
                  </div>

                  {/* Bottom Content Area */}
                  <div className="relative z-10 p-6 sm:p-7 space-y-2.5">
                    <div className="space-y-1">
                      <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight group-hover:text-brand-accent transition-colors">
                        {category.name}
                      </h3>
                      {category.description ? (
                        <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                          {category.description}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-400 italic">
                          Explore our signature luxury selection in this curated segment.
                        </p>
                      )}
                    </div>

                    {/* Action Prompt */}
                    <div className="pt-2 flex items-center justify-between border-t border-white/10">
                      <span className="text-xs font-semibold uppercase tracking-widest text-brand-accent flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                        <span>View Products</span>
                        <ArrowRight size={14} />
                      </span>

                      <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
                        Explore &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. ATELIER HERITAGE STANDARDS BANNER */}
        {/* ========================================================================= */}
        <div className="mt-16 sm:mt-24 p-8 sm:p-12 rounded-3xl bg-brand-surface border border-brand-border/80 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left divide-y md:divide-y-0 md:divide-x divide-brand-border/60">
            {/* Standard 1 */}
            <div className="space-y-2 md:pr-6">
              <div className="w-10 h-10 rounded-xl bg-brand-cream border border-brand-border flex items-center justify-center text-brand-accent">
                <Sparkles size={20} />
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-black">
                Uncompromising Provenance
              </h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Every timepiece, leather good, and bespoke fragrance is directly sourced from certified European artisans.
              </p>
            </div>

            {/* Standard 2 */}
            <div className="pt-6 md:pt-0 md:px-6 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-brand-cream border border-brand-border flex items-center justify-center text-brand-accent">
                <ShieldCheck size={20} />
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-black">
                White-Glove Guarantee
              </h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Complimentary insured express delivery and 30-day private client returns with authentication dossiers.
              </p>
            </div>

            {/* Standard 3 */}
            <div className="pt-6 md:pt-0 md:pl-6 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-brand-cream border border-brand-border flex items-center justify-center text-brand-accent">
                <Compass size={20} />
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-black">
                Concierge Assistance
              </h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Personal style consultation and private atelier appointments tailored to executive connoisseurs.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

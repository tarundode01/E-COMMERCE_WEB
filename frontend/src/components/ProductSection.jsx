import React, { useState, useEffect } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Container from './Container';
import SectionHeading from './SectionHeading';
import ProductCard from './ProductCard';
import Button from './Button';
import { productService } from '../services/api';
import { products as defaultSampleProducts } from '../data/products';

// Distinct category images to ensure different visual items across catalog
import watchImg from '../assets/luxury_watch.jpg';
import bagImg from '../assets/luxury_bag.jpg';
import perfumeImg from '../assets/luxury_perfume.jpg';
import sunglassesImg from '../assets/luxury_sunglasses.jpg';
import lifestyleImg from '../assets/hero_lifestyle.jpg';
import smartphoneImg from '../assets/luxury_smartphone_titanium.jpg';

/**
 * Resolves appropriate high-resolution image based on product category & name
 */
const getProductImage = (p = {}) => {
  if (p.image && typeof p.image === 'string' && p.image.trim() !== '' && !p.image.includes('undefined')) {
    return p.image;
  }
  const text = `${p.category || ''} ${p.name || ''}`.toLowerCase();
  if (text.includes('mobile') || text.includes('phone') || text.includes('smartphone')) {
    return smartphoneImg;
  }
  if (text.includes('perfume') || text.includes('fragrance') || text.includes('nectar') || text.includes('parfum')) {
    return perfumeImg;
  }
  if (text.includes('bag') || text.includes('leather') || text.includes('satchel') || text.includes('handbag')) {
    return bagImg;
  }
  if (text.includes('sunglass') || text.includes('eyewear') || text.includes('aviator') || text.includes('optics')) {
    return sunglassesImg;
  }
  if (text.includes('couture') || text.includes('apparel') || text.includes('overcoat') || text.includes('trench') || text.includes('cashmere')) {
    return lifestyleImg;
  }
  return watchImg;
};

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
 * Reusable ProductSection Component
 * Renders SectionHeading, live products from the catalog API in a responsive grid,
 * and a "View All Products" button.
 */
export default function ProductSection({
  title = 'Featured Products',
  subtitle = 'Explore an exquisite curation of signature essentials, handcrafted with uncompromising quality and timeless elegance.',
  badge = 'Curated Selection',
  products: initialPropProducts,
  onAddToCart,
  onToggleWishlist,
  viewAllLink = '/shop',
}) {
  const [liveProducts, setLiveProducts] = useState(initialPropProducts || null);

  useEffect(() => {
    if (initialPropProducts) return;
    let isMounted = true;
    productService
      .getProducts()
      .then((res) => {
        if (isMounted && res && res.success && res.products && res.products.length > 0) {
          const normalized = res.products.slice(0, 12).map((p) => ({
            ...p,
            id: p._id || p.id,
            _id: p._id || p.id,
            image: getProductImage(p),
            inStock: typeof p.stock === 'number' ? p.stock > 0 : true,
          }));
          setLiveProducts(normalized);
        }
      })
      .catch((err) => {
        console.warn('Unable to load live products for Home section, using fallback:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [initialPropProducts]);

  const displayProducts = liveProducts || initialPropProducts || defaultSampleProducts;
  return (
    <section className="py-16 sm:py-24 bg-brand-offwhite border-b border-brand-border/60 transition-colors">
      <Container size="default">
        {/* Section Heading */}
        <SectionHeading
          badge={badge}
          title={title}
          subtitle={subtitle}
          align="center"
        />

        {/* Responsive 8-Product Grid:
            - Mobile: 1 column
            - Small tablets: 2 columns
            - Large tablets: 3 columns
            - Desktops: 4 columns
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7">
          {displayProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>

        {/* "View All Products" Call-to-Action */}
        <div className="mt-14 sm:mt-16 flex justify-center">
          <SafeLink to={viewAllLink}>
            <Button
              variant="outline"
              size="lg"
              icon={ArrowRight}
              iconPosition="right"
              className="hover:bg-brand-surface shadow-xs hover:shadow-md transition-all group"
            >
              View All Products
            </Button>
          </SafeLink>
        </div>
      </Container>
    </section>
  );
}

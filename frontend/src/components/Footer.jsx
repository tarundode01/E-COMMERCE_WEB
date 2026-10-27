import React from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import {
  Globe,
  MessageCircle,
  Share2,
  Send,
  Mail,
  ArrowUpRight
} from 'lucide-react';
import Container from './Container';
import Input from './Input';
import Button from './Button';

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

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Premium, Responsive Ecommerce Footer Component
 * Includes:
 * - Brand name: Premium Store
 * - Short brand description
 * - Quick links: Home, Shop, About, Contact
 * - Customer support: FAQs, Shipping, Returns
 * - Social media & communication icons using Lucide React (Globe, MessageCircle, Share2, Send, Mail)
 * - Newsletter subscription utilizing reusable Input and Button components
 * - Copyright with current year
 */
export default function Footer() {

  const quickLinks = [
    { name: 'Home', to: '/' },
    { name: 'Shop', to: '/shop' },
    { name: 'About', to: '/about' },
    { name: 'Contact', to: '/contact' },
  ];

  const supportLinks = [
    { name: 'Track My Orders', to: '/orders' },
    { name: 'FAQs', to: '/faqs' },
    { name: 'Shipping', to: '/shipping' },
    { name: 'Returns', to: '/returns' },
  ];

  const socialIcons = [
    { icon: Globe, label: 'Global Network', href: '#global' },
    { icon: MessageCircle, label: 'Community', href: '#community' },
    { icon: Share2, label: 'Social Channels', href: '#channels' },
    { icon: Send, label: 'Telegram / Direct', href: '#direct' },
    { icon: Mail, label: 'Newsletter', href: '#newsletter' },
  ];

  return (
    <footer className="bg-brand-black text-white border-t border-brand-charcoal pt-16 pb-12 transition-colors">
      <Container size="default">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-white/10">
          {/* Brand Info & Mission (Col 1 to 4) */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <SafeLink to="/" className="inline-flex items-center gap-1.5 group">
              <span className="font-serif text-2xl font-bold tracking-tight text-white group-hover:text-brand-accent transition-colors">
                Premium Store
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mb-0.5"></span>
            </SafeLink>

            <p className="text-sm text-neutral-400 leading-relaxed max-w-sm font-light">
              Curators of timeless luxury essentials, handcrafted with uncompromising
              quality and understated sophistication for the discerning lifestyle.
            </p>

            {/* Social Media Icons (Lucide React) */}
            <div className="pt-2 flex items-center space-x-3">
              {socialIcons.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  title={label}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-brand-accent hover:border-brand-accent hover:bg-white/10 transition-all duration-200"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links (Col 5 to 6) */}
          <div className="lg:col-span-2 sm:col-span-1">
            <h3 className="text-xs uppercase tracking-widest font-semibold text-white mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <SafeLink
                    to={link.to}
                    className="text-sm text-neutral-400 hover:text-brand-accent transition-colors inline-flex items-center gap-1 group"
                  >
                    <span>{link.name}</span>
                    <ArrowUpRight
                      size={12}
                      className="opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all"
                    />
                  </SafeLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Support (Col 7 to 8) */}
          <div className="lg:col-span-2 sm:col-span-1">
            <h3 className="text-xs uppercase tracking-widest font-semibold text-white mb-4">
              Customer Support
            </h3>
            <ul className="space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <SafeLink
                    to={link.to}
                    className="text-sm text-neutral-400 hover:text-brand-accent transition-colors inline-flex items-center gap-1 group"
                  >
                    <span>{link.name}</span>
                    <ArrowUpRight
                      size={12}
                      className="opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all"
                    />
                  </SafeLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Subscription (Col 9 to 12) */}
          <div className="lg:col-span-4 flex flex-col space-y-3">
            <h3 className="text-xs uppercase tracking-widest font-semibold text-white">
              Privilege Newsletter
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Subscribe to receive private collection previews, editorial features, and exclusive access.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-2 pt-1">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  className="!bg-white/5 !text-white !border-white/15 placeholder:!text-neutral-500 focus:!border-brand-accent focus:!ring-brand-accent !py-2 text-xs"
                  required
                />
              </div>
              <Button
                type="submit"
                variant="accent"
                size="sm"
                className="shrink-0"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 space-y-4 sm:space-y-0">
          <p>© {CURRENT_YEAR} Premium Store. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <SafeLink to="/privacy" className="hover:text-neutral-300 transition-colors">
              Privacy Policy
            </SafeLink>
            <SafeLink to="/terms" className="hover:text-neutral-300 transition-colors">
              Terms of Service
            </SafeLink>
            <SafeLink to="/accessibility" className="hover:text-neutral-300 transition-colors">
              Accessibility
            </SafeLink>
          </div>
        </div>
      </Container>
    </footer>
  );
}

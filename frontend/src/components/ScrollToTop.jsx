import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Ensures every page navigation opens at the very top (header) instead of preserving
 * scroll position from previous page (which left visitors at the footer).
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {
      window.scrollTo(0, 0);
    }
  }, [pathname, search]);

  return null;
}


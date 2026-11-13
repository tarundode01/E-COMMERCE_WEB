/**
 * Helper to normalize image URLs across the application.
 * Prepends backend API base URL if the image path is relative (/uploads or /api/uploads).
 */
export const formatImageUrl = (url) => {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  // Vite bundled static asset in /dist/assets
  if (url.startsWith('/assets/') || url.includes('/assets/')) {
    return url;
  }
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};


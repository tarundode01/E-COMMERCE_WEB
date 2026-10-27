/**
 * Helper to normalize image URLs across the application.
 * Prepends backend API base URL if the image path is relative (/uploads or /api/uploads).
 */
export const formatImageUrl = (url) => {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};


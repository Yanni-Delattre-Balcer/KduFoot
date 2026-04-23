/**
 * Standardizes the API base URL from environment variables.
 * Prefers VITE_API_URL but falls back to API_BASE_URL.
 * Ensures no trailing slash for easier concatenation.
 */
export const getApiBaseUrl = (): string => {
  const url =
    import.meta.env.VITE_API_URL || import.meta.env.API_BASE_URL || "";

  return url.endsWith("/") ? url.slice(0, -1) : url;
};

/**
 * Combines the API base URL with a path.
 * Ensures the path starts with a slash if needed.
 */
export const getApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${base}${normalizedPath}`;
};

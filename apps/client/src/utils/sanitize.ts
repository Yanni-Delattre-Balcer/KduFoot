import DOMPurify from "dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * By default, it allows a safe set of tags and attributes.
 */
export const sanitizeHtml = (
  html: string,
  options: DOMPurify.Config = {},
): string => {
  return DOMPurify.sanitize(html, {
    ...options,
    USE_PROFILES: { html: true, ...options.USE_PROFILES },
  });
};

/**
 * Specialized sanitizer for SVG content (e.g., football drill schemas).
 */
export const sanitizeSvg = (svg: string): string => {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
};

/**
 * Analytics Utility for KduFoot V2
 *
 * Supports pluggable providers (Google Analytics, Pixel, etc.)
 */

type EventName =
  | "match_created"
  | "match_contacted"
  | "user_registered"
  | "pdf_exported"
  | "search_performed";

interface EventParams {
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

export const trackEvent = (eventName: EventName, params: EventParams = {}) => {
  // 1. Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${eventName}`, params);
  }

  // 2. Google Analytics (if present)
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, params);
  }

  // 3. Custom Tracking Pixel (if needed)
  // fetch('/api/track', { method: 'POST', body: JSON.stringify({ eventName, params }) });
};

export const trackConversion = (type: "registration" | "contact") => {
  trackEvent(type === "registration" ? "user_registered" : "match_contacted", {
    category: "conversion",
    non_interaction: false,
  });
};

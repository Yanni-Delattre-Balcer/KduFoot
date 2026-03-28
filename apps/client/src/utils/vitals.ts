import { onCLS, onLCP, onFCP, onTTFB, onINP, Metric } from "web-vitals";

/**
 * RUM (Real User Monitoring) implementation.
 * Captures Core Web Vitals and sends them to a backend or analytics service.
 * Standard Industrial Mundial: we measure actual performance in 4G and rural areas.
 */
const sendToAnalytics = (metric: Metric) => {
  const body = JSON.stringify(metric);
  const url = `${import.meta.env.API_BASE_URL}/api/analytics/vitals`;

  // Use sendBeacon for reliability (doesn't block navigation)
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, { body, method: "POST", keepalive: true });
  }

  // Also log to console in development
  if (import.meta.env.DEV) {
    console.log(
      `[RUM] ${metric.name}:`,
      (metric.value / 1000).toFixed(2),
      "s",
      metric,
    );
  }
};

export const reportWebVitals = () => {
  onCLS(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onINP(sendToAnalytics);
};

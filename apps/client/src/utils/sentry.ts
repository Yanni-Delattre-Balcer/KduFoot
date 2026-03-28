import * as Sentry from "@sentry/react";

/**
 * FAANG-Standard PII scrubbing patterns (Client-side)
 */
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  token: /Bearer\s+[a-zA-Z0-9-_.]+/gi,
  siret: /\b\d{14}\b/g,
};

/**
 * Recursively scrubs sensitive data from any value on the client.
 */
export function scrubPII(value: any): any {
  if (typeof value === "string") {
    return value
      .replace(PII_PATTERNS.email, "[EMAIL_REDACTED]")
      .replace(PII_PATTERNS.token, "Bearer [TOKEN_REDACTED]")
      .replace(PII_PATTERNS.siret, "[SIRET_REDACTED]");
  }

  if (Array.isArray(value)) {
    return value.map(scrubPII);
  }

  if (value !== null && typeof value === "object") {
    const scrubbed: any = {};

    for (const [key, val] of Object.entries(value)) {
      const lowKey = key.toLowerCase();
      const shouldScrub =
        lowKey.includes("email") ||
        lowKey.includes("token") ||
        lowKey.includes("password") ||
        lowKey.includes("address"); // Client-side specific: scrub addresses too

      scrubbed[key] = shouldScrub ? "[SENSITIVE_DATA_REDACTED]" : scrubPII(val);
    }

    return scrubbed;
  }

  return value;
}

/**
 * Initialize Sentry for React with PII scrubbing.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) return;

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      return scrubPII(event);
    },
  });
}

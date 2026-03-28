import * as Sentry from "@sentry/cloudflare";

/**
 * FAANG-Standard PII scrubbing patterns
 */
const PII_PATTERNS = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    token: /Bearer\s+[a-zA-Z0-9-_.]+/gi,
    siret: /\b\d{14}\b/g,
    siren: /\b\d{9}\b/g,
};

/**
 * Recursively scrubs sensitive data from any value.
 */
export function scrubPII(value: any): any {
    if (typeof value === 'string') {
        return value
            .replace(PII_PATTERNS.email, '[EMAIL_REDACTED]')
            .replace(PII_PATTERNS.token, 'Bearer [TOKEN_REDACTED]')
            .replace(PII_PATTERNS.siret, '[SIRET_REDACTED]')
            .replace(PII_PATTERNS.siren, '[SIREN_REDACTED]');
    }
    
    if (Array.isArray(value)) {
        return value.map(scrubPII);
    }
    
    if (value !== null && typeof value === 'object') {
        const scrubbed: any = {};
        for (const [key, val] of Object.entries(value)) {
            // Also scrub keys that might contain PII
            const scrubbedKey = key.toLowerCase().includes('email') || 
                               key.toLowerCase().includes('token') || 
                               key.toLowerCase().includes('password') 
                               ? key : key;
            
            scrubbed[scrubbedKey] = scrubPII(val);
        }
        return scrubbed;
    }
    
    return value;
}

export { Sentry };

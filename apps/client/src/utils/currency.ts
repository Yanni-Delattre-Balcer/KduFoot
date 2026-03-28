/**
 * FAANG Standard Pricing Object
 */
export interface Money {
  amount: number; // in cents
  currency: string; // ISO 4217
}

/**
 * Common VAT/Tax rates by country
 * In a real FAANG app, this would be fetched from a fiscal service or Stripe Tax API.
 */
const VAT_RATES: Record<string, number> = {
  FR: 0.2,
  BE: 0.21,
  ES: 0.21,
  DE: 0.19,
  IT: 0.22,
  GB: 0.2,
  US: 0.0, // Handling sales tax in US is complex, typically 0 here if handled by Stripe
};

/**
 * Formats a Money object into a localized currency string.
 */
export const formatPrice = (money: Money, locale: string = "fr-FR"): string => {
  const amount = money.amount / 100;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
};

/**
 * Calculates the tax and total for a given price and country.
 * Returns amounts in cents.
 */
export const calculateTax = (
  basePrice: Money,
  countryCode: string = "FR",
): {
  subtotal: number;
  tax: number;
  total: number;
  rate: number;
} => {
  const rate = VAT_RATES[countryCode.toUpperCase()] ?? 0;
  const tax = Math.round(basePrice.amount * rate);

  return {
    subtotal: basePrice.amount,
    tax: tax,
    total: basePrice.amount + tax,
    rate: rate,
  };
};

export interface Money {
    amount: number;
    currency: string;
}

const VAT_RATES: Record<string, number> = {
    FR: 0.20,
    BE: 0.21,
    ES: 0.21,
    DE: 0.19,
    IT: 0.22,
    GB: 0.20,
    US: 0.00,
};

export const formatPrice = (
    money: Money,
    locale: string = 'fr-FR'
): string => {
    const amount = money.amount / 100;
    
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: money.currency,
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2, 
    }).format(amount);
};

export const calculateTax = (
    basePrice: Money,
    countryCode: string = 'FR'
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
        rate: rate
    };
};

// Common currency info and helpers for the app

export const currencySymbols: Record<string, string> = {
  AUD: '$',
  USD: '$',
  CNY: '¥',
  CN: '¥',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  KRW: '₩',
  INR: '₹',
};

export function getCurrencySymbol(code?: string): string | undefined {
  if (!code) return undefined;
  return currencySymbols[code.toUpperCase()] ?? code.toUpperCase();
}

export const commonCurrencies = Object.keys(currencySymbols);

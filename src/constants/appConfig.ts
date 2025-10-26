// Centralized app configuration and defaults
export type LanguageEntry = {
  code: string;
  nameKey: string;
};

export const LANGUAGES: LanguageEntry[] = [
  { code: 'zh', nameKey: 'language_name_zh' },
  { code: 'en', nameKey: 'language_name_en' },
];

// Default UI language for the app
export const DEFAULT_UI_LANGUAGE = 'zh';

// Currency / exchange defaults
export const DEFAULT_FROM_CURRENCY = 'AUD';
export const DEFAULT_TO_CURRENCY = 'CNY';
export const DEFAULT_EXCHANGE_RATE = 4.7;
export const DEFAULT_EXCHANGE_SOURCE = 'default';

export const DEFAULT_CURRENCY = DEFAULT_FROM_CURRENCY;

// Other global defaults can be added here

// Supported currency options for UI (code and translation key)
export const CURRENCIES: { code: string; nameKey: string }[] = [
  { code: 'AUD', nameKey: 'currency_name_aud' },
  { code: 'CNY', nameKey: 'currency_name_cny' },
];

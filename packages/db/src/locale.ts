/**
 * Locale and country configuration for multi-region support
 */

export interface CountryConfig {
  code: string;
  name: string;
  fakerLocale: string;
  currencySymbol: string;
  currencyLocale: string;
}

export const COUNTRY_MAP: Record<string, CountryConfig> = {
  ph: {
    code: "ph",
    name: "Philippines",
    fakerLocale: "ph_PH",
    currencySymbol: "₱",
    currencyLocale: "en-PH",
  },
  us: {
    code: "us",
    name: "United States",
    fakerLocale: "en_US",
    currencySymbol: "$",
    currencyLocale: "en-US",
  },
  sg: {
    code: "sg",
    name: "Singapore",
    fakerLocale: "en_SG",
    currencySymbol: "$",
    currencyLocale: "en-SG",
  },
  my: {
    code: "my",
    name: "Malaysia",
    fakerLocale: "ms_MY",
    currencySymbol: "RM",
    currencyLocale: "ms-MY",
  },
  th: {
    code: "th",
    name: "Thailand",
    fakerLocale: "th_TH",
    currencySymbol: "฿",
    currencyLocale: "th-TH",
  },
  id: {
    code: "id",
    name: "Indonesia",
    fakerLocale: "id_ID",
    currencySymbol: "Rp",
    currencyLocale: "id-ID",
  },
  gb: {
    code: "gb",
    name: "United Kingdom",
    fakerLocale: "en_GB",
    currencySymbol: "£",
    currencyLocale: "en-GB",
  },
  au: {
    code: "au",
    name: "Australia",
    fakerLocale: "en_AU",
    currencySymbol: "$",
    currencyLocale: "en-AU",
  },
  ca: {
    code: "ca",
    name: "Canada",
    fakerLocale: "en_CA",
    currencySymbol: "$",
    currencyLocale: "en-CA",
  },
  nl: {
    code: "nl",
    name: "Netherlands",
    fakerLocale: "nl_NL",
    currencySymbol: "€",
    currencyLocale: "nl-NL",
  },
  de: {
    code: "de",
    name: "Germany",
    fakerLocale: "de_DE",
    currencySymbol: "€",
    currencyLocale: "de-DE",
  },
  fr: {
    code: "fr",
    name: "France",
    fakerLocale: "fr_FR",
    currencySymbol: "€",
    currencyLocale: "fr-FR",
  },
  es: {
    code: "es",
    name: "Spain",
    fakerLocale: "es_ES",
    currencySymbol: "€",
    currencyLocale: "es-ES",
  },
  jp: {
    code: "jp",
    name: "Japan",
    fakerLocale: "ja_JP",
    currencySymbol: "¥",
    currencyLocale: "ja-JP",
  },
  cn: {
    code: "cn",
    name: "China",
    fakerLocale: "zh_CN",
    currencySymbol: "¥",
    currencyLocale: "zh-CN",
  },
  hk: {
    code: "hk",
    name: "Hong Kong",
    fakerLocale: "zh_HK",
    currencySymbol: "HK$",
    currencyLocale: "zh-HK",
  },
  in: {
    code: "in",
    name: "India",
    fakerLocale: "en_IN",
    currencySymbol: "₹",
    currencyLocale: "en-IN",
  },
};

export function getCountryConfig(countryCode: string): CountryConfig {
  return COUNTRY_MAP[countryCode.toLowerCase()] || COUNTRY_MAP.ph;
}

export function getFakerLocale(countryCode: string): string {
  return getCountryConfig(countryCode).fakerLocale;
}

export function getCurrencyConfig(countryCode: string) {
  const config = getCountryConfig(countryCode);
  return {
    symbol: config.currencySymbol,
    locale: config.currencyLocale,
  };
}

export const SUPPORTED_COUNTRIES = Object.values(COUNTRY_MAP).map((c) => ({
  value: c.code,
  label: c.name,
}));

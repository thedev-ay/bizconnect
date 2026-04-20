export const TENANT_PLAN_OPTIONS = [
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
  { value: "enterprise", label: "Enterprise" },
] as const;

export const TENANT_COUNTRY_OPTIONS = [
  { value: "ph", label: "Philippines" },
  { value: "us", label: "United States" },
  { value: "sg", label: "Singapore" },
  { value: "my", label: "Malaysia" },
  { value: "th", label: "Thailand" },
  { value: "id", label: "Indonesia" },
  { value: "gb", label: "United Kingdom" },
  { value: "au", label: "Australia" },
  { value: "ca", label: "Canada" },
  { value: "nl", label: "Netherlands" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "es", label: "Spain" },
  { value: "jp", label: "Japan" },
  { value: "cn", label: "China" },
  { value: "hk", label: "Hong Kong" },
  { value: "in", label: "India" },
] as const;

export const TENANT_INDUSTRY_OPTIONS = [
  { value: "automotive", label: "Automotive" },
  { value: "electronics-repair", label: "Electronics repair" },
  { value: "laundry", label: "Laundry" },
  { value: "health-beauty", label: "Health & beauty" },
  { value: "food-beverage", label: "Food & beverage" },
  { value: "specialty-retail", label: "Specialty retail" },
  { value: "professional-services", label: "Professional services" },
] as const;

export const TENANT_COMPANY_SIZE_OPTIONS = [
  { value: "solo", label: "Solo" },
  { value: "2-10", label: "2-10 people" },
  { value: "11-50", label: "11-50 people" },
  { value: "51-200", label: "51-200 people" },
  { value: "200+", label: "200+ people" },
] as const;

export const TENANT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
] as const;

export const TENANT_COUNTRY_LABELS = Object.fromEntries(
  TENANT_COUNTRY_OPTIONS.map((option) => [option.value, option.label])
) as Record<(typeof TENANT_COUNTRY_OPTIONS)[number]["value"], string>;

export const TENANT_PLAN_LABELS = Object.fromEntries(
  TENANT_PLAN_OPTIONS.map((option) => [option.value, option.label])
) as Record<(typeof TENANT_PLAN_OPTIONS)[number]["value"], string>;

export const TENANT_INDUSTRY_LABELS = Object.fromEntries(
  TENANT_INDUSTRY_OPTIONS.map((option) => [option.value, option.label])
) as Record<(typeof TENANT_INDUSTRY_OPTIONS)[number]["value"], string>;

export const TENANT_COMPANY_SIZE_LABELS = Object.fromEntries(
  TENANT_COMPANY_SIZE_OPTIONS.map((option) => [option.value, option.label])
) as Record<(typeof TENANT_COMPANY_SIZE_OPTIONS)[number]["value"], string>;

export const TENANT_STATUS_LABELS = Object.fromEntries(
  TENANT_STATUS_OPTIONS.map((option) => [option.value, option.label])
) as Record<(typeof TENANT_STATUS_OPTIONS)[number]["value"], string>;

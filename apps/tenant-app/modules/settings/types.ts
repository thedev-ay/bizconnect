export interface BusinessHoursEntry {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface TenantSettings {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  currencySymbol: string;
  currencyLocale: string;
  defaultTaxRate: string;
  businessHours: BusinessHoursEntry[];
}

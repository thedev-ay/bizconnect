export type PricingType = "per_piece" | "per_kilo" | "flat";

export const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  per_piece: "Per Piece",
  per_kilo: "Per Kilo",
  flat: "Flat Rate",
};

export interface Service {
  id: string;
  name: string;
  description: string | null;
  pricingType: PricingType;
  price: string; // Decimal serialized as string
  category: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

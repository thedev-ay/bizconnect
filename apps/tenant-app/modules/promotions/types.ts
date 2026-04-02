export type PromoType = "percent_off" | "flat_off" | "fixed_price" | "buy_x_get_y" | "day_time";

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  type: PromoType;
  value: string;
  buyQty: number | null;
  getQty: number | null;
  daysOfWeek: number[] | null;
  startTime: string | null;
  endTime: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  items: { id: string; itemId: string; item: { id: string; name: string } }[];
}

export const PROMO_TYPE_LABELS: Record<PromoType, string> = {
  percent_off: "Percent Off",
  flat_off: "Flat Amount Off",
  fixed_price: "Fixed Price",
  buy_x_get_y: "Buy X Get Y Free",
  day_time: "Day / Time Discount",
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

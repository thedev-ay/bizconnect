import type { PromoType } from "./types";

interface ActivePromo {
  id: string;
  type: PromoType;
  value: number;
  buyQty: number | null;
  getQty: number | null;
  daysOfWeek: number[] | null;
  startTime: string | null;
  endTime: string | null;
}

/**
 * Given an active promotion and a product's original price + quantity in cart,
 * returns { unitPrice, promoDiscount, label } after applying the promo.
 *
 * For buy_x_get_y: only the "free" units have promoDiscount; paid units are full price.
 */
export function applyPromo(
  promo: ActivePromo,
  originalPrice: number,
  quantity: number,
  now = new Date()
): { unitPrice: number; promoDiscount: number; label: string } | null {
  // Day/time gate
  if (promo.type === "day_time") {
    const day = now.getDay();
    if (promo.daysOfWeek && promo.daysOfWeek.length > 0 && !promo.daysOfWeek.includes(day)) {
      return null;
    }
    if (promo.startTime && promo.endTime) {
      const [sh, sm] = promo.startTime.split(":").map(Number);
      const [eh, em] = promo.endTime.split(":").map(Number);
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      if (nowMins < startMins || nowMins > endMins) return null;
    }
    // Falls through to apply value as percent_off
    const discount = (promo.value / 100) * originalPrice;
    return {
      unitPrice: originalPrice - discount,
      promoDiscount: discount,
      label: `${promo.value}% off (day/time)`,
    };
  }

  if (promo.type === "percent_off") {
    const discount = (promo.value / 100) * originalPrice;
    return {
      unitPrice: originalPrice - discount,
      promoDiscount: discount,
      label: `${promo.value}% off`,
    };
  }

  if (promo.type === "flat_off") {
    const discount = Math.min(promo.value, originalPrice);
    return {
      unitPrice: originalPrice - discount,
      promoDiscount: discount,
      label: `-${promo.value} off`,
    };
  }

  if (promo.type === "fixed_price") {
    const discount = Math.max(0, originalPrice - promo.value);
    return {
      unitPrice: promo.value,
      promoDiscount: discount,
      label: `Fixed price`,
    };
  }

  if (promo.type === "buy_x_get_y") {
    const buyQty = promo.buyQty ?? 1;
    const getQty = promo.getQty ?? 1;
    const setSize = buyQty + getQty;
    const freeSets = Math.floor(quantity / setSize);
    const freeUnits = freeSets * getQty;
    if (freeUnits === 0) return null;
    // Total discount = free units × original price, spread across all units
    const totalDiscount = freeUnits * originalPrice;
    const discountPerUnit = totalDiscount / quantity;
    return {
      unitPrice: originalPrice - discountPerUnit,
      promoDiscount: discountPerUnit,
      label: `Buy ${buyQty} get ${getQty} free`,
    };
  }

  return null;
}

/**
 * From a list of active promotions for a product, picks the best one
 * (the one that gives the greatest discount per unit).
 */
export function bestPromo(
  promos: ActivePromo[],
  originalPrice: number,
  quantity: number,
  now = new Date()
) {
  let best: ReturnType<typeof applyPromo> = null;
  let bestDiscount = 0;

  for (const promo of promos) {
    const result = applyPromo(promo, originalPrice, quantity, now);
    if (result && result.promoDiscount > bestDiscount) {
      best = result;
      bestDiscount = result.promoDiscount;
    }
  }

  return best;
}

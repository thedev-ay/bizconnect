"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, Trash2, ShoppingCart, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CartItem } from "../types";
import { createSale } from "../actions";
import { queueOfflineSale } from "@/lib/offline-sale";
import { bestPromo } from "@/modules/promotions/apply";
import type { PromoType } from "@/modules/promotions";
import { StatusBadge } from "@/components/ui/status-badge";

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

interface POSProduct {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  sku: string | null;
  category: string | null;
  promotions: ActivePromo[];
}

interface POSService {
  id: string;
  name: string;
  pricingType: "per_piece" | "per_kilo" | "flat";
  price: number;
  category: string | null;
}

interface POSTerminalProps {
  products: POSProduct[];
  services: POSService[];
  servicesEnabled: boolean;
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  currencySymbol: string;
  currencyLocale: string;
}

export function POSTerminal({
  products,
  services,
  servicesEnabled,
  tenantSlug,
  tenantId,
  tenantName,
  currencySymbol,
  currencyLocale,
}: POSTerminalProps) {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "services">("products");
  const [weightService, setWeightService] = useState<POSService | null>(null);
  const [weightInput, setWeightInput] = useState("");

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === "percent"
    ? Math.min((discountValue / 100) * subtotal, subtotal)
    : Math.min(discountValue, subtotal);
  const total = Math.max(0, subtotal - discountAmount);
  const change = Math.max(0, Number(amountPaid) - total);
  const availableTabs: ("products" | "services")[] = servicesEnabled ? ["products", "services"] : ["products"];
  const emptyCartMessage = servicesEnabled
    ? "Tap a product or service to add it"
    : "Tap a product to add it";

  // Product categories
  const productCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean) as string[])
  ).sort();

  const serviceCategories = Array.from(
    new Set(services.map((s) => s.category).filter(Boolean) as string[])
  ).sort();

  const filteredProducts = products.filter((p) => {
    if (p.quantity <= 0) return false;
    if (activeCategory && p.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredServices = services.filter((s) => {
    if (activeCategory && s.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q);
    }
    return true;
  });

  const categories = activeTab === "products" ? productCategories : serviceCategories;
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalSavings = cart.reduce((sum, item) => sum + item.promoDiscount * item.quantity, 0);

  function getAvailableStock(itemId: string) {
    const product = products.find((entry) => entry.id === itemId);
    return product?.quantity ?? 0;
  }

  function addToCart(product: POSProduct) {
    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error("Insufficient stock");
          return prev;
        }
        const newQty = existing.quantity + 1;
        const promo = bestPromo(product.promotions, product.unitPrice, newQty);
        const unitPrice = promo ? promo.unitPrice : product.unitPrice;
        return prev.map((i) =>
          i.itemId === product.id
            ? {
                ...i,
                quantity: newQty,
                unitPrice,
                originalPrice: product.unitPrice,
                promoDiscount: promo ? promo.promoDiscount : 0,
                promoLabel: promo ? promo.label : null,
                total: newQty * unitPrice,
              }
            : i
        );
      }
      const promo = bestPromo(product.promotions, product.unitPrice, 1);
      const unitPrice = promo ? promo.unitPrice : product.unitPrice;
      return [
        ...prev,
        {
          itemId: product.id,
          itemType: "product" as const,
          name: product.name,
          unitPrice,
          originalPrice: product.unitPrice,
          promoDiscount: promo ? promo.promoDiscount : 0,
          promoLabel: promo ? promo.label : null,
          quantity: 1,
          weight: null,
          total: unitPrice,
        },
      ];
    });
  }

  function addServiceToCart(service: POSService, weight?: number) {
    setCart((prev) => {
      if (service.pricingType === "per_kilo") {
        const kg = weight ?? 0;
        const total = kg * service.price;
        const existing = prev.find((i) => i.itemId === service.id);
        if (existing) {
          return prev.map((i) =>
            i.itemId === service.id
              ? { ...i, weight: kg, total }
              : i
          );
        }
        return [
          ...prev,
          {
            itemId: service.id,
            itemType: "service" as const,
            name: service.name,
            unitPrice: service.price,
            originalPrice: service.price,
            promoDiscount: 0,
            promoLabel: null,
            quantity: 1,
            weight: kg,
            total,
          },
        ];
      }

      // per_piece or flat
      const existing = prev.find((i) => i.itemId === service.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        return prev.map((i) =>
          i.itemId === service.id
            ? { ...i, quantity: newQty, total: newQty * service.price }
            : i
        );
      }
      return [
        ...prev,
        {
          itemId: service.id,
          itemType: "service" as const,
          name: service.name,
          unitPrice: service.price,
          originalPrice: service.price,
          promoDiscount: 0,
          promoLabel: null,
          quantity: 1,
          weight: null,
          total: service.price,
        },
      ];
    });
  }

  function handleServiceTap(service: POSService) {
    if (service.pricingType === "per_kilo") {
      const existing = cart.find((i) => i.itemId === service.id);
      setWeightInput(existing?.weight?.toString() ?? "");
      setWeightService(service);
    } else {
      addServiceToCart(service);
    }
  }

  function confirmWeight() {
    const kg = parseFloat(weightInput);
    if (!weightService || isNaN(kg) || kg <= 0) {
      toast.error("Enter a valid weight");
      return;
    }
    addServiceToCart(weightService, kg);
    setWeightService(null);
    setWeightInput("");
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.itemId !== itemId) return i;
          const newQty = i.quantity + delta;
          if (newQty <= 0) return null as unknown as CartItem;
          if (i.itemType === "product") {
            const availableStock = getAvailableStock(itemId);
            if (delta > 0 && newQty > availableStock) {
              toast.error("Insufficient stock");
              return i;
            }
            const product = products.find((p) => p.id === itemId);
            const promo = product ? bestPromo(product.promotions, i.originalPrice, newQty) : null;
            const unitPrice = promo ? promo.unitPrice : i.originalPrice;
            return {
              ...i,
              quantity: newQty,
              unitPrice,
              promoDiscount: promo ? promo.promoDiscount : 0,
              promoLabel: promo ? promo.label : null,
              total: newQty * unitPrice,
            };
          }
          return { ...i, quantity: newQty, total: newQty * i.unitPrice };
        })
        .filter(Boolean)
    );
  }

  function setItemQuantity(itemId: string, nextQuantity: number) {
    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item;

        if (item.itemType === "product") {
          const availableStock = getAvailableStock(itemId);
          if (nextQuantity > availableStock) {
            toast.error("Insufficient stock");
            return item;
          }

          const product = products.find((entry) => entry.id === itemId);
          const promo = product ? bestPromo(product.promotions, item.originalPrice, nextQuantity) : null;
          const unitPrice = promo ? promo.unitPrice : item.originalPrice;

          return {
            ...item,
            quantity: nextQuantity,
            unitPrice,
            promoDiscount: promo ? promo.promoDiscount : 0,
            promoLabel: promo ? promo.label : null,
            total: nextQuantity * unitPrice,
          };
        }

        return {
          ...item,
          quantity: nextQuantity,
          total: nextQuantity * item.unitPrice,
        };
      })
    );
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((i) => i.itemId !== itemId));
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    if (!amountPaid || Number(amountPaid) < total) {
      toast.error(`Amount paid must be at least ${currencySymbol}${total.toFixed(2)}`);
      return;
    }
    setSubmitting(true);

    const saleInput = {
      items: cart.map((i) => ({
        itemId: i.itemType === "product" ? i.itemId : undefined,
        itemType: i.itemType,
        name: i.name,
        quantity: i.quantity,
        weight: i.weight ?? undefined,
        unitPrice: i.unitPrice,
        originalPrice: i.originalPrice,
        promoDiscount: i.promoDiscount,
        total: i.total,
      })),
      subtotal,
      discount: discountAmount,
      total,
      amountPaid: Number(amountPaid),
      paymentMethod: paymentMethod as "cash" | "card" | "gcash" | "maya",
    };

    // ── Offline path ──────────────────────────────────────────────────────
    if (!navigator.onLine) {
      try {
        const refNo = await queueOfflineSale(tenantSlug, tenantId, saleInput);
        setCart([]);
        setDiscountValue(0);
        setAmountPaid("");
        toast.success(`Sale queued offline (${refNo}). Will sync when back online.`);
        queryClient.invalidateQueries({ queryKey: ["pos-products", tenantSlug] });
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to save offline sale");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ── Online path ───────────────────────────────────────────────────────
    try {
      const sale = await createSale(tenantSlug, tenantId, saleInput);
      setCart([]);
      setDiscountValue(0);
      setAmountPaid("");
      toast.success("Sale completed");
      queryClient.invalidateQueries({ queryKey: ["pos-products", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["inventory", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["sales", tenantSlug] });
      window.location.href = `/${tenantSlug}/sales?saleId=${sale.id}`;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to process sale");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="grid h-full gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_410px]">

        {/* ── Left: browser ── */}
        <div className="flex min-h-0 flex-col gap-3 rounded-[calc(var(--radius)+8px)] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(248,250,252,0.9)_100%)] p-3 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)]">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <p className="eyebrow-label">Browse</p>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl">
                {activeTab === "products" ? "Catalog" : "Service Menu"}
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-[calc(var(--radius)+2px)] border border-primary/10 bg-primary/[0.035] p-2 text-xs text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <div className="rounded-xl bg-white/80 px-3 py-2">
                <p className="text-[0.68rem] uppercase tracking-[0.16em] text-primary/70">Shown</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {activeTab === "products" ? filteredProducts.length : filteredServices.length}
                </p>
              </div>
              <div className="rounded-xl bg-white/80 px-3 py-2">
                <p className="text-[0.68rem] uppercase tracking-[0.16em] text-primary/70">Cart</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{totalUnits}</p>
              </div>
              <div className="rounded-xl bg-white/80 px-3 py-2">
                <p className="text-[0.68rem] uppercase tracking-[0.16em] text-primary/70">Value</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {currencySymbol}{total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          {availableTabs.length > 1 && (
            <div className="flex gap-1 rounded-[calc(var(--radius)+2px)] border border-border/70 bg-muted/35 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              {availableTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setActiveCategory(null); setSearch(""); }}
                  className={cn(
                    "flex-1 rounded-[calc(var(--radius)-6px)] px-3 py-2 text-sm font-medium transition-all",
                    activeTab === tab
                      ? "bg-primary text-primary-foreground shadow-[0_12px_24px_-18px_rgba(13,148,136,0.8)]"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                  )}
                >
                  {tab === "products" ? "Products" : "Services"}
                  {tab === "services" && services.length > 0 && (
                    <span className="ml-1.5 text-xs text-current/70">({services.length})</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              placeholder={activeTab === "products" ? "Search by name or SKU..." : "Search services..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-2 rounded-[calc(var(--radius)-2px)] border border-border/70 bg-white/82 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary/75" />
              {activeCategory ? `Filtering: ${activeCategory}` : "Showing all categories"}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-1">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                  activeCategory === null
                    ? "border-primary/10 bg-primary text-primary-foreground shadow-[0_12px_20px_-16px_rgba(13,148,136,0.75)]"
                    : "border-border/70 bg-white/70 text-muted-foreground hover:border-primary/20 hover:bg-primary/5 hover:text-foreground"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                    activeCategory === cat
                      ? "border-primary/10 bg-primary text-primary-foreground shadow-[0_12px_20px_-16px_rgba(13,148,136,0.75)]"
                      : "border-border/70 bg-white/70 text-muted-foreground hover:border-primary/20 hover:bg-primary/5 hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Product grid */}
          {activeTab === "products" && (
            <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group rounded-[calc(var(--radius)+2px)] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,250,250,0.95)_100%)] p-3.5 text-left shadow-[0_24px_42px_-34px_rgba(15,23,42,0.38)] transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_28px_52px_-34px_rgba(13,148,136,0.5)] focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {product.category && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                      {product.category}
                    </p>
                  )}
                  <p className="text-sm font-semibold leading-tight text-foreground">
                    {product.name}
                  </p>
                  {product.sku && (
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{product.sku}</p>
                  )}
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <span className="text-base font-bold tracking-[-0.03em] text-foreground">
                      {currencySymbol}{product.unitPrice.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                    </span>
                    <span className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      product.quantity <= 5
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-border/70 bg-muted/70 text-muted-foreground"
                    )}>
                      {product.quantity} left
                    </span>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full rounded-[calc(var(--radius)+4px)] border border-dashed border-border/70 bg-white/60 py-14 text-center text-sm text-muted-foreground">
                  No products found
                </div>
              )}
            </div>
          )}

          {/* Service grid */}
          {activeTab === "services" && (
            <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-3 2xl:grid-cols-4">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceTap(service)}
                  className="group rounded-[calc(var(--radius)+2px)] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,250,250,0.95)_100%)] p-3.5 text-left shadow-[0_24px_42px_-34px_rgba(15,23,42,0.38)] transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_28px_52px_-34px_rgba(13,148,136,0.5)] focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {service.category && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                      {service.category}
                    </p>
                  )}
                  <p className="text-sm font-semibold leading-tight text-foreground">
                    {service.name}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <span className="text-base font-bold tracking-[-0.03em] text-foreground">
                      {currencySymbol}{service.price.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="flex items-center gap-0.5 rounded-full border border-border/70 bg-muted/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {service.pricingType === "per_kilo" && <Scale className="h-2.5 w-2.5" />}
                      {service.pricingType === "per_kilo" ? "/kg" : service.pricingType === "per_piece" ? "/pc" : "flat"}
                    </span>
                  </div>
                </button>
              ))}
              {filteredServices.length === 0 && (
                <div className="col-span-full rounded-[calc(var(--radius)+4px)] border border-dashed border-border/70 bg-white/60 py-14 text-center text-sm text-muted-foreground">
                  No services found
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: cart & checkout ── */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[calc(var(--radius)+10px)] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(236,253,250,0.96)_54%,rgba(220,252,247,0.88)_100%)] shadow-[0_30px_70px_-34px_rgba(13,148,136,0.32)] xl:sticky xl:top-0 xl:h-full">

          {/* Cart header */}
          <div className="flex shrink-0 items-center justify-between border-b border-primary/10 px-5 py-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShoppingCart className="h-4 w-4" />
                Checkout
                {cart.length > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground tabular-nums">
                    {totalUnits}
                  </span>
                )}
              </div>
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                Clear all
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center px-8">
                <div className="max-w-xs text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[2rem] bg-white/80 text-primary shadow-[0_22px_40px_-26px_rgba(13,148,136,0.45)] ring-1 ring-primary/10">
                    <ShoppingCart className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-foreground">Cart is empty</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{emptyCartMessage}</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {cart.map((item) => (
                  <div key={item.itemId} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <div className="flex items-center gap-1.5">
                        {item.itemType === "service" && item.weight != null ? (
                          <p className="text-xs text-muted-foreground">{currencySymbol}{item.unitPrice.toFixed(2)}/kg</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{currencySymbol}{item.unitPrice.toFixed(2)} each</p>
                        )}
                        {item.promoDiscount > 0 && (
                          <p className="text-xs text-muted-foreground/60 line-through">{currencySymbol}{item.originalPrice.toFixed(2)}</p>
                        )}
                      </div>
                      {item.promoLabel ? (
                        <StatusBadge tone="success" className="mt-1.5 inline-flex">
                          {item.promoLabel}
                        </StatusBadge>
                      ) : null}
                    </div>

                    {/* Per-kilo: show weight + edit button */}
                    {item.itemType === "service" && item.weight != null ? (
                      <button
                        onClick={() => {
                          const svc = services.find((s) => s.id === item.itemId);
                          if (svc) {
                            setWeightInput(item.weight!.toString());
                            setWeightService(svc);
                          }
                        }}
                        className="flex shrink-0 items-center gap-1 rounded-md border border-border/70 bg-white/70 px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-white"
                      >
                        <Scale className="h-3 w-3" />
                        {item.weight} kg
                      </button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => updateQty(item.itemId, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-white/75 text-muted-foreground hover:bg-white hover:text-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <Input
                          type="number"
                          min={1}
                          max={item.itemType === "product" ? getAvailableStock(item.itemId) : undefined}
                          value={item.quantity}
                          onChange={(e) => {
                            const parsed = Number.parseInt(e.target.value, 10);
                            if (Number.isNaN(parsed)) return;
                            setItemQuantity(item.itemId, parsed);
                          }}
                          className="h-7 w-14 px-1 text-center text-sm font-semibold tabular-nums"
                        />
                        <button
                          onClick={() => updateQty(item.itemId, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-white/75 text-muted-foreground hover:bg-white hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                      {currencySymbol}{item.total.toFixed(2)}
                    </span>
                    <button onClick={() => removeFromCart(item.itemId)} className="shrink-0 text-muted-foreground/55 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & checkout */}
          {cart.length > 0 && (
            <div className="shrink-0 space-y-3 border-t border-primary/10 bg-white/72 px-5 py-5 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-2 rounded-[calc(var(--radius)-2px)] border border-border/70 bg-white/75 p-2">
                <div className="rounded-xl bg-muted/45 px-3 py-2">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-primary/70">Items</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{totalUnits}</p>
                </div>
                <div className="rounded-xl bg-muted/45 px-3 py-2">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-primary/70">Savings</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {currencySymbol}{totalSavings.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{currencySymbol}{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-muted-foreground">Discount</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setDiscountType("flat")}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-semibold transition-all",
                      discountType === "flat" ? "border-primary/10 bg-primary text-primary-foreground" : "border-border/70 bg-white/70 text-muted-foreground hover:bg-white hover:text-foreground"
                    )}
                  >
                    {currencySymbol}
                  </button>
                  <button
                    onClick={() => setDiscountType("percent")}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-semibold transition-all",
                      discountType === "percent" ? "border-primary/10 bg-primary text-primary-foreground" : "border-border/70 bg-white/70 text-muted-foreground hover:bg-white hover:text-foreground"
                    )}
                  >
                    %
                  </button>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={discountType === "percent" ? 100 : subtotal}
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="ml-auto h-8 w-20 text-right text-sm"
                  placeholder="0"
                />
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span className="tabular-nums">−{currencySymbol}{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-lg font-semibold text-foreground">
                <span>Total</span>
                <span className="tabular-nums">{currencySymbol}{total.toFixed(2)}</span>
              </div>

              <Select value={paymentMethod} onValueChange={(v) => { if (v) setPaymentMethod(v); }}>
                <SelectTrigger className="text-sm">
                  {paymentMethod ? { cash: "Cash", card: "Card", gcash: "GCash", maya: "Maya" }[paymentMethod] : <span className="text-muted-foreground">Select...</span>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="maya">Maya</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">Amount paid</span>
                <Input
                  type="number"
                  step="0.01"
                  min={total}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="flex-1 text-right text-sm"
                />
              </div>

              {Number(amountPaid) >= total && (
                <div className="flex justify-between rounded-[calc(var(--radius)-2px)] border border-primary/10 bg-primary/8 px-3 py-2 text-sm font-semibold text-foreground">
                  <span>Change</span>
                  <span className="tabular-nums">{currencySymbol}{change.toFixed(2)}</span>
                </div>
              )}

              <Button className="w-full shadow-[0_22px_44px_-24px_rgba(13,148,136,0.6)]" size="lg" onClick={handleCheckout} disabled={submitting || cart.length === 0}>
                {submitting ? "Processing..." : `Charge ${currencySymbol}${total.toFixed(2)}`}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Weight input dialog */}
      <Dialog open={!!weightService} onOpenChange={(o) => { if (!o) { setWeightService(null); setWeightInput(""); } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{weightService?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-zinc-500">
              {currencySymbol}{weightService?.price.toFixed(2)} per kg
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Weight (kg)</label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 2.5"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") confirmWeight(); }}
              />
            </div>
            {weightInput && !isNaN(parseFloat(weightInput)) && parseFloat(weightInput) > 0 && (
              <p className="text-sm font-semibold text-zinc-800">
                Total: {currencySymbol}{(parseFloat(weightInput) * (weightService?.price ?? 0)).toFixed(2)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWeightService(null); setWeightInput(""); }}>Cancel</Button>
            <Button onClick={confirmWeight}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

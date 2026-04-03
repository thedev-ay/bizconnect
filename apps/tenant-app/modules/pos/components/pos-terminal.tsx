"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { bestPromo } from "@/modules/promotions/apply";
import type { PromoType } from "@/modules/promotions";
import { ReceiptPrintDialog } from "@/components/receipt";

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
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  currencySymbol: string;
  currencyLocale: string;
}

export function POSTerminal({ products, services, tenantSlug, tenantId, tenantName, currencySymbol, currencyLocale }: POSTerminalProps) {
  const router = useRouter();
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
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === "percent"
    ? Math.min((discountValue / 100) * subtotal, subtotal)
    : Math.min(discountValue, subtotal);
  const total = Math.max(0, subtotal - discountAmount);
  const change = Math.max(0, Number(amountPaid) - total);

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
    try {
      const sale = await createSale(tenantSlug, tenantId, {
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
      });
      
      // Store completed sale and open receipt dialog
      setCompletedSale(sale);
      setReceiptOpen(true);
      
      // Reset cart and form
      setCart([]);
      setDiscountValue(0);
      setAmountPaid("");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to process sale");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="grid h-full grid-cols-[1fr_360px] gap-4 overflow-hidden">

        {/* ── Left: browser ── */}
        <div className="flex min-h-0 flex-col gap-3">

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
            {(["products", "services"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setActiveCategory(null); setSearch(""); }}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                {tab === "products" ? "Products" : "Services"}
                {tab === "services" && services.length > 0 && (
                  <span className="ml-1.5 text-xs text-zinc-400">({services.length})</span>
                )}
              </button>
            ))}
          </div>

          <Input
            placeholder={activeTab === "products" ? "Search by name or SKU..." : "Search services..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  activeCategory === null
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    activeCategory === cat
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Product grid */}
          {activeTab === "products" && (
            <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group rounded-xl border border-zinc-200 bg-white p-3 text-left transition-all hover:border-zinc-400 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                >
                  {product.category && (
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                      {product.category}
                    </p>
                  )}
                  <p className="text-sm font-semibold leading-tight text-zinc-800 group-hover:text-zinc-900">
                    {product.name}
                  </p>
                  {product.sku && (
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-400">{product.sku}</p>
                  )}
                  <div className="mt-2.5 flex items-end justify-between">
                    <span className="text-sm font-bold text-zinc-900">
                      {currencySymbol}{product.unitPrice.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                    </span>
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      product.quantity <= 5
                        ? "bg-amber-50 text-amber-600"
                        : "bg-zinc-100 text-zinc-500"
                    )}>
                      {product.quantity} left
                    </span>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-zinc-400">
                  No products found
                </div>
              )}
            </div>
          )}

          {/* Service grid */}
          {activeTab === "services" && (
            <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceTap(service)}
                  className="group rounded-xl border border-zinc-200 bg-white p-3 text-left transition-all hover:border-zinc-400 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                >
                  {service.category && (
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                      {service.category}
                    </p>
                  )}
                  <p className="text-sm font-semibold leading-tight text-zinc-800 group-hover:text-zinc-900">
                    {service.name}
                  </p>
                  <div className="mt-2.5 flex items-end justify-between gap-1">
                    <span className="text-sm font-bold text-zinc-900">
                      {currencySymbol}{service.price.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 flex items-center gap-0.5">
                      {service.pricingType === "per_kilo" && <Scale className="h-2.5 w-2.5" />}
                      {service.pricingType === "per_kilo" ? "/kg" : service.pricingType === "per_piece" ? "/pc" : "flat"}
                    </span>
                  </div>
                </button>
              ))}
              {filteredServices.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-zinc-400">
                  No services found
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: cart & checkout ── */}
        <div className="flex min-h-0 flex-col rounded-xl border border-zinc-200 bg-white overflow-hidden">

          {/* Cart header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cart.length > 0 && (
                <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white tabular-nums">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-zinc-400 hover:text-zinc-700">
                Clear all
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-zinc-400">Tap a product or service to add it</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {cart.map((item) => (
                  <div key={item.itemId} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-800">{item.name}</p>
                      <div className="flex items-center gap-1.5">
                        {item.itemType === "service" && item.weight != null ? (
                          <p className="text-xs text-zinc-400">{currencySymbol}{item.unitPrice.toFixed(2)}/kg</p>
                        ) : (
                          <p className="text-xs text-zinc-400">{currencySymbol}{item.unitPrice.toFixed(2)} each</p>
                        )}
                        {item.promoDiscount > 0 && (
                          <p className="text-xs text-zinc-300 line-through">{currencySymbol}{item.originalPrice.toFixed(2)}</p>
                        )}
                      </div>
                      {item.promoLabel && (
                        <p className="text-[10px] font-medium text-emerald-600">{item.promoLabel}</p>
                      )}
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
                        className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                      >
                        <Scale className="h-3 w-3" />
                        {item.weight} kg
                      </button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => updateQty(item.itemId, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.itemId, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-zinc-800">
                      {currencySymbol}{item.total.toFixed(2)}
                    </span>
                    <button onClick={() => removeFromCart(item.itemId)} className="shrink-0 text-zinc-300 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & checkout */}
          {cart.length > 0 && (
            <div className="shrink-0 border-t border-zinc-100 px-4 py-3 space-y-3">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{currencySymbol}{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-zinc-500">Discount</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setDiscountType("flat")}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                      discountType === "flat" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    )}
                  >
                    {currencySymbol}
                  </button>
                  <button
                    onClick={() => setDiscountType("percent")}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                      discountType === "percent" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
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
                  className="h-7 w-20 text-right text-sm ml-auto"
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

              <div className="flex justify-between font-bold text-zinc-900">
                <span>Total</span>
                <span className="tabular-nums">{currencySymbol}{total.toFixed(2)}</span>
              </div>

              <Select value={paymentMethod} onValueChange={(v) => { if (v) setPaymentMethod(v); }}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="maya">Maya</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs text-zinc-500">Amount paid</span>
                <Input
                  type="number"
                  step="0.01"
                  min={total}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="h-8 flex-1 text-right text-sm"
                />
              </div>

              {Number(amountPaid) >= total && (
                <div className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800">
                  <span>Change</span>
                  <span className="tabular-nums">{currencySymbol}{change.toFixed(2)}</span>
                </div>
              )}

              <Button className="w-full" size="lg" onClick={handleCheckout} disabled={submitting || cart.length === 0}>
                {submitting ? "Processing..." : `Charge ${currencySymbol}${total.toFixed(2)}`}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Receipt dialog */}
      {completedSale && (
        <ReceiptPrintDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          type="sale"
          referenceNo={completedSale.referenceNo}
          createdAt={completedSale.createdAt}
          items={completedSale.items}
          subtotal={completedSale.subtotal}
          discount={completedSale.discount}
          total={completedSale.total}
          amountPaid={completedSale.amountPaid}
          change={completedSale.change}
          paymentMethod={completedSale.paymentMethod}
          tenantName={tenantName}
          currencySymbol={currencySymbol}
        />
      )}

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

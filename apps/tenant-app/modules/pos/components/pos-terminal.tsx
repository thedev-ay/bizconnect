"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, Trash2, ShoppingCart, Receipt } from "lucide-react";
import type { CartItem } from "../types";
import { createSale } from "../actions";

interface POSProduct {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  sku: string | null;
}

interface POSTerminalProps {
  products: POSProduct[];
  tenantSlug: string;
  tenantId: string;
}

export function POSTerminal({ products, tenantSlug, tenantId }: POSTerminalProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [lastReceipt, setLastReceipt] = useState<{
    referenceNo: string;
    total: number;
    change: number;
  } | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(0, subtotal - discount);
  const change = Math.max(0, Number(amountPaid) - total);

  const filteredProducts = products.filter(
    (p) =>
      p.quantity > 0 &&
      (search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  function addToCart(product: POSProduct) {
    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error("Insufficient stock");
          return prev;
        }
        return prev.map((i) =>
          i.itemId === product.id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      return [
        ...prev,
        {
          itemId: product.id,
          name: product.name,
          unitPrice: product.unitPrice,
          quantity: 1,
          total: product.unitPrice,
        },
      ];
    });
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.itemId !== itemId) return i;
          const newQty = i.quantity + delta;
          if (newQty <= 0) return null as unknown as CartItem;
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
      toast.error("Amount paid must be at least ₱" + total.toFixed(2));
      return;
    }

    setSubmitting(true);
    try {
      const sale = await createSale(tenantSlug, tenantId, {
        items: cart,
        subtotal,
        discount,
        total,
        amountPaid: Number(amountPaid),
        paymentMethod: paymentMethod as any,
      });

      setLastReceipt({
        referenceNo: sale.referenceNo,
        total: Number(sale.total),
        change: Number(sale.change),
      });

      setCart([]);
      setDiscount(0);
      setAmountPaid("");
      toast.success(`Sale recorded — ${sale.referenceNo}`);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to process sale");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1fr_380px]">
      {/* Product Grid */}
      <div className="flex flex-col gap-4">
        <Input
          placeholder="Search products by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="rounded-lg border bg-card p-3 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <div className="mb-1 font-medium leading-tight">{product.name}</div>
              {product.sku && (
                <code className="text-xs text-muted-foreground">{product.sku}</code>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-primary">
                  ₱{product.unitPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
                <Badge variant="outline" className="text-xs">
                  {product.quantity} left
                </Badge>
              </div>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              No products found
            </div>
          )}
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="flex flex-col gap-4">
        {lastReceipt && (
          <Card className="border-green-500/50 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-green-700">
                <Receipt className="h-4 w-4" />
                Last Transaction
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>
                <span className="text-muted-foreground">Ref:</span>{" "}
                <strong>{lastReceipt.referenceNo}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Total:</span> ₱
                {lastReceipt.total.toFixed(2)}
              </p>
              <p>
                <span className="text-muted-foreground">Change:</span> ₱
                {lastReceipt.change.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              Cart{cart.length > 0 && ` (${cart.length})`}
            </CardTitle>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                Clear
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Tap a product to add it
                </p>
              ) : (
                cart.map((item) => (
                  <div key={item.itemId} className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ₱{item.unitPrice.toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQty(item.itemId, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQty(item.itemId, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="w-20 text-right text-sm font-medium">
                      ₱{item.total.toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground"
                      onClick={() => removeFromCart(item.itemId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₱{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount (₱)</span>
                    <Input
                      type="number"
                      min={0}
                      max={subtotal}
                      value={discount || ""}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="h-7 w-24 text-right text-sm"
                    />
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>₱{total.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={(v) => { if (v) setPaymentMethod(v as string); }}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="gcash">GCash</SelectItem>
                        <SelectItem value="maya">Maya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Amount Paid (₱)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min={total}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={`Min: ₱${total.toFixed(2)}`}
                      className="h-8"
                    />
                  </div>
                  {Number(amountPaid) >= total && (
                    <div className="flex justify-between rounded-md bg-muted px-3 py-2 text-sm font-bold">
                      <span>Change</span>
                      <span>₱{change.toFixed(2)}</span>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={handleCheckout}
                    disabled={submitting || cart.length === 0}
                  >
                    {submitting ? "Processing..." : "Charge ₱" + total.toFixed(2)}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

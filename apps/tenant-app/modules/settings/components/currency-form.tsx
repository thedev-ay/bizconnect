"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCurrencySettings } from "../actions";

const schema = z.object({
  currencySymbol: z.string().min(1, "Required").max(5),
  currencyLocale: z.string().min(2, "Required"),
  defaultTaxRate: z.number().min(0).max(100),
});

type FormData = z.infer<typeof schema>;

interface CurrencyFormProps {
  tenantSlug: string;
  tenantId: string;
  defaultValues: FormData;
}

const COMMON_CURRENCIES = [
  { label: "Philippine Peso (₱)", symbol: "₱", locale: "en-PH" },
  { label: "US Dollar ($)", symbol: "$", locale: "en-US" },
  { label: "Euro (€)", symbol: "€", locale: "nl-NL" },
  { label: "British Pound (£)", symbol: "£", locale: "en-GB" },
  { label: "Japanese Yen (¥)", symbol: "¥", locale: "ja-JP" },
  { label: "Indonesian Rupiah (Rp)", symbol: "Rp", locale: "id-ID" },
  { label: "Malaysian Ringgit (RM)", symbol: "RM", locale: "ms-MY" },
  { label: "Singapore Dollar (S$)", symbol: "S$", locale: "en-SG" },
];

export function CurrencyForm({ tenantSlug, tenantId, defaultValues }: CurrencyFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const currentSymbol = watch("currencySymbol");
  const currentLocale = watch("currencyLocale");

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      await updateCurrencySettings(tenantSlug, tenantId, data);
      toast.success("Currency settings saved");
      router.refresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Quick Select</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_CURRENCIES.map((c) => (
            <button
              key={c.locale}
              type="button"
              onClick={() => { setValue("currencySymbol", c.symbol); setValue("currencyLocale", c.locale); }}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                currentSymbol === c.symbol && currentLocale === c.locale
                  ? "border-teal-600 bg-teal-600 text-white shadow-[0_12px_24px_-18px_rgba(13,148,136,0.9)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:text-slate-950"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Currency Symbol</Label>
          <Input {...register("currencySymbol")} placeholder="€" />
          {errors.currencySymbol && <p className="text-xs text-red-600">{errors.currencySymbol.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Locale</Label>
          <Input {...register("currencyLocale")} placeholder="nl-NL" />
          <p className="text-xs text-muted-foreground">Controls number formatting</p>
          {errors.currencyLocale && <p className="text-xs text-red-600">{errors.currencyLocale.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Default Tax Rate (%)</Label>
          <Input type="number" step="0.01" min="0" max="100" {...register("defaultTaxRate", { valueAsNumber: true })} placeholder="12" />
          <p className="text-xs text-muted-foreground">Applied by default to new invoices</p>
          {errors.defaultTaxRate && <p className="text-xs text-red-600">{errors.defaultTaxRate.message}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" className="rounded-full" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

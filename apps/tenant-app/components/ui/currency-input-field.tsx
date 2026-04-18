"use client";

import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CurrencyInputFieldProps extends ComponentProps<typeof Input> {
  currencySymbol: string;
  error?: string;
  label?: ReactNode;
}

export function CurrencyInputField({
  currencySymbol,
  error,
  label,
  className,
  ...props
}: CurrencyInputFieldProps) {
  return (
    <div className="space-y-1.5">
      {label ? <Label className="text-xs font-medium text-foreground/80">{label}</Label> : null}
      <div className="flex">
        <span className="inline-flex items-center justify-center rounded-l-md border border-r-0 border-input bg-muted/60 px-3 text-sm text-muted-foreground">
          {currencySymbol}
        </span>
        <Input
          type="number"
          step="0.01"
          min={0}
          className={["rounded-l-none", className].filter(Boolean).join(" ")}
          {...props}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

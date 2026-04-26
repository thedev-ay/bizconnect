"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromotionDialog } from "./promotion-dialog";
import { useTopbarCta } from "@/components/layout/topbar-cta-context";

interface ProductOption {
  id: string;
  name: string;
  category: string | null;
}

interface NewPromotionButtonProps {
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  products: ProductOption[];
}

export function NewPromotionButton({
  tenantSlug,
  tenantId,
  currencySymbol,
  products,
}: NewPromotionButtonProps) {
  const [open, setOpen] = useState(false);
  useTopbarCta("New Promotion", () => setOpen(true));

  return (
    <>
      <Button className="rounded-full px-4" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> New
      </Button>

      <PromotionDialog
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        currencySymbol={currencySymbol}
        products={products}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

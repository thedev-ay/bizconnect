"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromotionDialog } from "./promotion-dialog";

interface ProductOption {
  id: string;
  name: string;
  category: string | null;
}

interface NewPromotionButtonProps {
  tenantSlug: string;
  tenantId: string;
  products: ProductOption[];
}

export function NewPromotionButton({ tenantSlug, tenantId, products }: NewPromotionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="rounded-full px-4" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> New
      </Button>

      <PromotionDialog
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        products={products}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

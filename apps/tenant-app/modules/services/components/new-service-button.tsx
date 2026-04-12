"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceDialog } from "./service-dialog";

interface NewServiceButtonProps {
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
}

export function NewServiceButton({ tenantSlug, tenantId, currencySymbol }: NewServiceButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="rounded-full px-4" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> New
      </Button>

      <ServiceDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        currencySymbol={currencySymbol}
      />
    </>
  );
}

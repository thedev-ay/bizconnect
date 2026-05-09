"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTopbarCta } from "@/components/layout/topbar-cta-context";
import { ServiceDialog } from "./service-dialog";

interface NewServiceButtonProps {
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  showDuration: boolean;
  showAppointmentsAvailability: boolean;
  showJobOrdersAvailability: boolean;
  showTrigger?: boolean;
}

export function NewServiceButton({
  tenantSlug,
  tenantId,
  currencySymbol,
  showDuration,
  showAppointmentsAvailability,
  showJobOrdersAvailability,
  showTrigger = true,
}: NewServiceButtonProps) {
  const [open, setOpen] = useState(false);
  useTopbarCta("New Service", () => setOpen(true));

  return (
    <>
      {showTrigger ? (
        <Button className="rounded-full px-4" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New
        </Button>
      ) : null}

      <ServiceDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        currencySymbol={currencySymbol}
        showDuration={showDuration}
        showAppointmentsAvailability={showAppointmentsAvailability}
        showJobOrdersAvailability={showJobOrdersAvailability}
      />
    </>
  );
}

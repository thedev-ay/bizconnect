"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteService } from "@/modules/staff";

interface DeleteServiceButtonProps {
  serviceId: string;
  tenantSlug: string;
  tenantId: string;
}

export function DeleteServiceButton({ serviceId, tenantSlug, tenantId }: DeleteServiceButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this service? Staff assignments for this service will also be removed.")) return;
    setLoading(true);
    try {
      await deleteService(tenantSlug, tenantId, serviceId);
      toast.success("Service deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      disabled={loading}
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

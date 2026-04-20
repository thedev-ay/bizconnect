"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TenantStatusToggleProps {
  tenantId: string;
  isActive: boolean;
}

export function TenantStatusToggle({ tenantId, isActive }: TenantStatusToggleProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setLoading(true);
    const res = await fetch(`/api/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setLoading(false);

    if (!res.ok) {
      toast.error("Failed to update tenant status");
      return;
    }

    toast.success(`Tenant ${isActive ? "suspended" : "reactivated"} successfully`);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={isActive ? "destructive" : "default"} size="sm" />}>
        {isActive ? "Suspend Tenant" : "Reactivate Tenant"}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-5 text-left">
          <p className="admin-eyebrow">Tenant / Status</p>
          <DialogTitle className="mt-1 text-xl font-semibold tracking-tight">
            {isActive ? "Suspend Tenant?" : "Reactivate Tenant?"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {isActive
              ? "Suspending this tenant will prevent all their users from logging in. You can reactivate it at any time."
              : "This will restore access for all tenant users."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-full px-4"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant={isActive ? "destructive" : "default"}
            className="rounded-full px-4"
            onClick={handleToggle}
            disabled={loading}
          >
            {loading ? "Updating..." : isActive ? "Suspend" : "Reactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

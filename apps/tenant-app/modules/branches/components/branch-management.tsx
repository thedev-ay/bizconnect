"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, PowerOff, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { createBranch, updateBranch, deactivateBranch } from "../actions";

type Branch = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
};

interface BranchManagementProps {
  tenantSlug: string;
  branches: Branch[];
  currentBranchId: string | null;
}

const emptyForm = { name: "", slug: "", address: "", phone: "", email: "" };

export function BranchManagement({ tenantSlug, branches, currentBranchId }: BranchManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setForm({
      name: branch.name,
      slug: branch.slug,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      email: branch.email ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  }

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  function handleNameChange(value: string) {
    setForm((f) => ({
      ...f,
      name: value,
      ...(editing ? {} : { slug: autoSlug(value) }),
    }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.slug.trim()) errs.slug = "Required";
    if (!/^[a-z0-9-]+$/.test(form.slug)) errs.slug = "Lowercase letters, numbers, hyphens only";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email";
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    startTransition(async () => {
      try {
        if (editing) {
          await updateBranch(tenantSlug, editing.id, form);
          toast.success("Branch updated");
        } else {
          await createBranch(tenantSlug, form);
          toast.success("Branch created");
        }
        setDialogOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save branch");
      }
    });
  }

  function handleDeactivate(branchId: string) {
    startTransition(async () => {
      try {
        await deactivateBranch(tenantSlug, branchId);
        toast.success("Branch deactivated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to deactivate branch");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Branches</h2>
          <p className="text-sm text-muted-foreground">
            Manage your business locations. All operational data is scoped to the active branch.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Branch
        </Button>
      </div>

      <div className="space-y-3">
        {branches.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <GitBranch className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No branches yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your first branch to start scoping operations by location.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Branch
            </Button>
          </div>
        )}

        {branches.map((branch) => (
          <div
            key={branch.id}
            className="flex items-center justify-between rounded-xl border bg-card px-5 py-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{branch.name}</span>
                {branch.id === currentBranchId && (
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="font-mono">/{branch.slug}</span>
                {branch.address && <span>{branch.address}</span>}
                {branch.phone && <span>{branch.phone}</span>}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(branch)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={isPending}
                  >
                    <PowerOff className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deactivate {branch.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This branch will no longer appear in the branch switcher. Existing data
                      for this branch is preserved. You must have at least one active branch.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDeactivate(branch.id)}
                    >
                      Deactivate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Branch" : "Add Branch"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="branch-name">Name</Label>
              <Input
                id="branch-name"
                placeholder="Main Branch"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-slug">Slug</Label>
              <div className="flex items-center">
                <span className="flex h-9 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                  /
                </span>
                <Input
                  id="branch-slug"
                  placeholder="main-branch"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                  className="rounded-l-none"
                />
              </div>
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-address">Address <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="branch-address"
                placeholder="123 Main Street"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch-phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="branch-phone"
                  placeholder="+1 555-0100"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch-email">Email <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="branch-email"
                  type="email"
                  placeholder="branch@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving…" : editing ? "Save Changes" : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

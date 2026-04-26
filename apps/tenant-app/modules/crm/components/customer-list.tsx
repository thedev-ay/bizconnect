"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Search, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer } from "../types";
import { deleteCustomer } from "../actions";
import { EditCustomerDialog } from "./edit-customer-dialog";

interface CustomerListProps {
  customers: Customer[];
  tenantSlug: string;
  tenantId: string;
  dateLocale: string;
  jobOrderCounts: Record<string, number>;
  assetsEnabled: boolean;
  assetsByCustomer: Partial<Record<string, Array<{ id: string; customerId: string; name: string; assetType: string; identifier: string | null; brand: string | null; model: string | null; serialNo: string | null; status: string }>>>;
  branches: Array<{ id: string; name: string }>;
}

const TAG_STYLES: Record<string, string> = {
  vip: "border-amber-200 bg-amber-50 text-amber-700",
  new: "border-emerald-200 bg-emerald-50 text-emerald-700",
  regular: "border-sky-200 bg-sky-50 text-sky-700",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatCustomerDate(value: string | Date, locale: string) {
  return new Intl.DateTimeFormat(locale || "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function isInteractiveTarget(target: EventTarget | null, container: HTMLElement) {
  if (!(target instanceof HTMLElement)) return false;
  const interactiveAncestor = target.closest("a, button, [role='button'], [role='menuitem']");
  return Boolean(interactiveAncestor && interactiveAncestor !== container);
}

export function CustomerList({ customers, tenantSlug, tenantId, dateLocale, jobOrderCounts, assetsEnabled, assetsByCustomer, branches }: CustomerListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q)
      )
    : customers;

  function handleOpenCustomer(customer: Customer) {
    if (loading === customer.id) return;
    setEditing(customer);
  }

  function handleCustomerClick(event: MouseEvent<HTMLElement>, customer: Customer) {
    if (isInteractiveTarget(event.target, event.currentTarget)) return;
    handleOpenCustomer(customer);
  }

  function handleCustomerKeyDown(event: KeyboardEvent<HTMLElement>, customer: Customer) {
    if (isInteractiveTarget(event.target, event.currentTarget)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleOpenCustomer(customer);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    setLoading(id);
    try {
      await deleteCustomer(tenantSlug, tenantId, id);
      await queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
      toast.success("Customer deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete customer");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="border-b border-border/60 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none text-muted-foreground/55" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers…"
            className="w-full rounded-full border border-border/60 bg-muted/30 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/55 focus:border-border focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="space-y-3 p-4 sm:hidden">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {q ? `No customers matching "${searchQuery}"` : "No customers yet."}
          </div>
        ) : (
          filtered.map((customer) => (
            <div
              key={customer.id}
              role="button"
              tabIndex={0}
              onClick={(event) => handleCustomerClick(event, customer)}
              onKeyDown={(event) => handleCustomerKeyDown(event, customer)}
              className={cn("rounded-[24px] border border-border/70 bg-white p-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.26)] outline-none transition hover:border-primary/25 hover:shadow-[0_20px_36px_-28px_rgba(15,23,42,0.32)] focus-visible:ring-2 focus-visible:ring-primary/30", loading === customer.id && "opacity-50")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(customer.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{customer.name}</p>
                    {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" />}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenCustomer(customer)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(customer.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {customer.email && <p className="mt-2 break-all text-sm text-muted-foreground">{customer.email}</p>}
              {customer.address && <p className="mt-2 text-sm text-muted-foreground">{customer.address}</p>}
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{jobOrderCounts[customer.id] ?? 0}</span>
                  <Link href={`/${tenantSlug}/job-orders?customerId=${customer.id}`} className="text-xs font-medium text-primary hover:text-primary/80">
                    New job
                  </Link>
                </div>
                <span className="text-xs text-muted-foreground">{formatCustomerDate(customer.createdAt, dateLocale)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {customer.tags.length > 0
                  ? customer.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                          TAG_STYLES[tag] ?? "border-border bg-muted/40 text-muted-foreground"
                        )}
                      >
                        {tag}
                      </span>
                    ))
                  : <span className="text-xs text-muted-foreground/50">No tags</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="pl-14 text-xs uppercase tracking-[0.22em] text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Contact</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Address</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Jobs</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Tags</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Since</TableHead>
              <TableHead className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center gap-3 py-20 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/60 text-muted-foreground shadow-sm">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {q ? `No customers matching "${searchQuery}"` : "No customers yet"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {q ? "Try a different search term." : "Add your first customer to get started."}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((customer) => (
                <TableRow
                  key={customer.id}
                  role="button"
                  tabIndex={0}
                  onClick={(event) => handleCustomerClick(event, customer)}
                  onKeyDown={(event) => handleCustomerKeyDown(event, customer)}
                  className={cn("cursor-pointer border-border/60 outline-none hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/25", loading === customer.id && "opacity-50")}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(customer.name)}
                      </div>
                      <span className="text-sm font-medium text-foreground">{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.email && (
                      <div className="text-sm text-foreground">{customer.email}</div>
                    )}
                    {customer.phone && (
                      <div className="text-xs text-muted-foreground">{customer.phone}</div>
                    )}
                    {!customer.email && !customer.phone && (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.address ?? <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {jobOrderCounts[customer.id] ?? 0}
                      </span>
                      <Link
                        href={`/${tenantSlug}/job-orders?customerId=${customer.id}`}
                        className="text-xs font-medium text-primary hover:text-primary/80"
                      >
                        New
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.length > 0
                        ? customer.tags.map((tag) => (
                            <span
                              key={tag}
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                                TAG_STYLES[tag] ?? "border-border bg-muted/40 text-muted-foreground"
                              )}
                            >
                              {tag}
                            </span>
                          ))
                        : <span className="text-muted-foreground/50">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatCustomerDate(customer.createdAt, dateLocale)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 data-[state=open]:opacity-100 hover:text-foreground" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenCustomer(customer)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(customer.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <EditCustomerDialog
          customer={editing}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          assetsEnabled={assetsEnabled}
          assets={assetsByCustomer[editing.id] ?? []}
          branches={branches}
          open={!!editing}
          onOpenChange={(o) => { if (!o) setEditing(null); }}
        />
      )}
    </>
  );
}

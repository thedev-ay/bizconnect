"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer } from "../types";
import { deleteCustomer } from "../actions";
import { EditCustomerDialog } from "./edit-customer-dialog";

interface CustomerListProps {
  customers: Customer[];
  tenantSlug: string;
  tenantId: string;
  jobOrderCounts: Record<string, number>;
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

export function CustomerList({ customers, tenantSlug, tenantId, jobOrderCounts }: CustomerListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    setLoading(id);
    try {
      await deleteCustomer(tenantSlug, tenantId, id);
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
        {customers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="py-14 text-center text-sm text-muted-foreground">
              No customers yet.
            </TableCell>
          </TableRow>
        ) : (
          customers.map((customer) => (
            <TableRow
              key={customer.id}
              className={cn("border-border/60 hover:bg-muted/30", loading === customer.id && "opacity-50")}
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
                {format(new Date(customer.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="pr-4">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" />}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(customer)}>
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

      {editing && (
        <EditCustomerDialog
          customer={editing}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          open={!!editing}
          onOpenChange={(o) => { if (!o) setEditing(null); }}
        />
      )}
    </>
  );
}

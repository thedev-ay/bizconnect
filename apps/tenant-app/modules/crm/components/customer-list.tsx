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
import { MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer } from "../types";
import { deleteCustomer } from "../actions";

interface CustomerListProps {
  customers: Customer[];
  tenantSlug: string;
  tenantId: string;
  jobOrderCounts: Record<string, number>;
}

const TAG_STYLES: Record<string, string> = {
  vip: "bg-amber-50 text-amber-700 border-amber-200",
  new: "bg-emerald-50 text-emerald-700 border-emerald-200",
  regular: "bg-blue-50 text-blue-700 border-blue-200",
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
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-100 hover:bg-transparent">
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Name</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Contact</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Address</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Jobs</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tags</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Since</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="py-12 text-center text-sm text-zinc-400">
              No customers yet.
            </TableCell>
          </TableRow>
        ) : (
          customers.map((customer) => (
            <TableRow
              key={customer.id}
              className={cn("border-zinc-100 hover:bg-zinc-50/50", loading === customer.id && "opacity-50")}
            >
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                    {getInitials(customer.name)}
                  </div>
                  <span className="text-sm font-medium text-zinc-900">{customer.name}</span>
                </div>
              </TableCell>
              <TableCell>
                {customer.email && (
                  <div className="text-sm text-zinc-700">{customer.email}</div>
                )}
                {customer.phone && (
                  <div className="text-xs text-zinc-400">{customer.phone}</div>
                )}
                {!customer.email && !customer.phone && (
                  <span className="text-zinc-300">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-zinc-500">
                {customer.address ?? <span className="text-zinc-300">—</span>}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-700">
                    {jobOrderCounts[customer.id] ?? 0}
                  </span>
                  <Link
                    href={`/${tenantSlug}/job-orders?customerId=${customer.id}`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    New Job
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
                            TAG_STYLES[tag] ?? "bg-zinc-50 text-zinc-600 border-zinc-200"
                          )}
                        >
                          {tag}
                        </span>
                      ))
                    : <span className="text-zinc-300">—</span>}
                </div>
              </TableCell>
              <TableCell className="text-sm text-zinc-500">
                {format(new Date(customer.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-700" />}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
  );
}

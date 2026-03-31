"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
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
import type { Customer } from "../types";
import { deleteCustomer } from "../actions";

interface CustomerListProps {
  customers: Customer[];
  tenantSlug: string;
  tenantId: string;
}

export function CustomerList({ customers, tenantSlug, tenantId }: CustomerListProps) {
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
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Since</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
              No customers yet.
            </TableCell>
          </TableRow>
        ) : (
          customers.map((customer) => (
            <TableRow key={customer.id} className={loading === customer.id ? "opacity-50" : ""}>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell>
                {customer.email && (
                  <div className="text-sm">{customer.email}</div>
                )}
                {customer.phone && (
                  <div className="text-xs text-muted-foreground">{customer.phone}</div>
                )}
                {!customer.email && !customer.phone && (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {customer.address ?? "—"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {customer.tags.length > 0
                    ? customer.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs capitalize">
                          {tag}
                        </Badge>
                      ))
                    : "—"}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(customer.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"/>}>
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

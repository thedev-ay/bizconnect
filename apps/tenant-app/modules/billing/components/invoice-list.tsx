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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, XCircle, Send } from "lucide-react";
import type { Invoice } from "../types";
import { markInvoicePaid, voidInvoice, sendInvoice } from "../actions";

interface InvoiceListProps {
  invoices: Invoice[];
  tenantSlug: string;
  tenantId: string;
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  sent: "secondary",
  paid: "default",
  void: "destructive",
};

export function InvoiceList({ invoices, tenantSlug, tenantId }: InvoiceListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(
    invoiceId: string,
    action: (slug: string, id: string, iid: string) => Promise<unknown>,
    successMsg: string
  ) {
    setLoading(invoiceId);
    try {
      await action(tenantSlug, tenantId, invoiceId);
      toast.success(successMsg);
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Paid At</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
              No invoices yet.
            </TableCell>
          </TableRow>
        ) : (
          invoices.map((inv) => {
            const isOverdue =
              inv.status !== "paid" &&
              inv.status !== "void" &&
              new Date(inv.dueDate) < new Date();

            return (
              <TableRow key={inv.id} className={loading === inv.id ? "opacity-50" : ""}>
                <TableCell className="font-mono text-sm font-medium">{inv.invoiceNo}</TableCell>
                <TableCell>
                  <div className="font-medium">{inv.customerName}</div>
                  {inv.customerEmail && (
                    <div className="text-xs text-muted-foreground">{inv.customerEmail}</div>
                  )}
                </TableCell>
                <TableCell className={isOverdue ? "text-destructive" : "text-muted-foreground"}>
                  {format(new Date(inv.dueDate), "MMM d, yyyy")}
                  {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                </TableCell>
                <TableCell className="text-right font-medium">
                  ₱{Number(inv.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[inv.status] ?? "outline"} className="capitalize">
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {inv.paidAt ? format(new Date(inv.paidAt), "MMM d, yyyy") : "—"}
                </TableCell>
                <TableCell>
                  {inv.status !== "void" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"></Button>}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {inv.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() => handleAction(inv.id, sendInvoice, "Invoice marked as sent")}
                          >
                            <Send className="mr-2 h-4 w-4" /> Mark as Sent
                          </DropdownMenuItem>
                        )}
                        {inv.status !== "paid" && (
                          <DropdownMenuItem
                            onClick={() => handleAction(inv.id, markInvoicePaid, "Invoice marked as paid")}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleAction(inv.id, voidInvoice, "Invoice voided")}
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Void
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

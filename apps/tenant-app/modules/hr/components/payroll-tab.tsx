"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generatePayroll, updatePayrollStatus } from "../actions";
import type { Employee, PayrollRecord } from "../types";

interface PayrollTabProps {
  employees: Employee[];
  records: PayrollRecord[];
  tenantSlug: string;
  tenantId: string;
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  draft: "outline",
  processed: "secondary",
  paid: "default",
};

export function PayrollTab({ employees, records, tenantSlug, tenantId }: PayrollTabProps) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [deductions, setDeductions] = useState("0");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  async function handleGenerate() {
    if (!employeeId || !periodStart || !periodEnd) {
      toast.error("Employee and period are required");
      return;
    }
    setGenerating(true);
    try {
      await generatePayroll(tenantSlug, tenantId, employeeId, periodStart, periodEnd, Number(deductions));
      toast.success("Payroll generated");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to generate payroll");
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatus(id: string, status: "processed" | "paid") {
    setLoading(id);
    try {
      await updatePayrollStatus(tenantSlug, tenantId, id, status);
      toast.success(`Payroll marked as ${status}`);
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">Generate Payroll</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Employee</Label>
            <Select onValueChange={(v) => { if (v) setEmployeeId(v as string); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Period Start</Label>
            <Input type="date" className="h-8 text-xs" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Period End</Label>
            <Input type="date" className="h-8 text-xs" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Deductions (₱)</Label>
            <Input type="number" min={0} step="0.01" className="h-8 text-xs" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
          </div>
        </div>
        {selectedEmployee && (
          <p className="mt-2 text-xs text-muted-foreground">
            Base salary: ₱{Number(selectedEmployee.salary ?? 0).toLocaleString("en-PH")} ·
            Commission rate: {selectedEmployee.commissionRate ?? 0}%
          </p>
        )}
        <Button size="sm" className="mt-3" onClick={handleGenerate} disabled={generating}>
          {generating ? "Calculating..." : "Generate Payroll"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Base</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead className="text-right">Deductions</TableHead>
            <TableHead className="text-right">Net Pay</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No payroll records yet.</TableCell></TableRow>
          ) : (
            records.map((r) => (
              <TableRow key={r.id} className={loading === r.id ? "opacity-50" : ""}>
                <TableCell className="font-medium">{r.employeeName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(r.periodStart), "MMM d")} – {format(new Date(r.periodEnd), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">₱{Number(r.baseSalary).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right text-green-600">₱{Number(r.commission).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right text-destructive">₱{Number(r.deductions).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right font-bold">₱{Number(r.netPay).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[r.status] ?? "outline"} className="capitalize">{r.status}</Badge>
                </TableCell>
                <TableCell>
                  {r.status === "draft" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatus(r.id, "processed")}>Process</Button>
                  )}
                  {r.status === "processed" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatus(r.id, "paid")}>Mark Paid</Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

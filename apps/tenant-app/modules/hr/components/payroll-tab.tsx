"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generatePayroll, updatePayrollStatus, deletePayrollRecord } from "../actions";
import type { Employee, PayrollRecord } from "../types";

interface PayrollTabProps {
  employees: Employee[];
  records: PayrollRecord[];
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
}

const STATUS_PILL: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  processed: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function PayrollTab({ employees, records, tenantSlug, tenantId, currencySymbol, currencyLocale }: PayrollTabProps) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
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
    if (new Date(periodEnd) < new Date(periodStart)) {
      toast.error("Period end must be on or after period start");
      return;
    }
    setGenerating(true);
    try {
      await generatePayroll(tenantSlug, tenantId, employeeId, periodStart, periodEnd, Number(deductions));
      toast.success("Payroll generated");
      setFormKey((k) => k + 1);
      setEmployeeId("");
      setPeriodStart("");
      setPeriodEnd("");
      setDeductions("0");
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this payroll draft? This cannot be undone.")) return;
    setLoading(id);
    try {
      await deletePayrollRecord(tenantSlug, tenantId, id);
      toast.success("Payroll draft deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 p-4">
        <p className="mb-3 text-sm font-semibold text-zinc-900">Generate Payroll</p>
        <div key={formKey} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Employee</Label>
            <Select value={employeeId} onValueChange={(v) => { if (v) setEmployeeId(v); }}>
              <SelectTrigger className="h-8 text-xs">{employeeId ? employees.find((e) => e.id === employeeId)?.name : <span className="text-muted-foreground">Select...</span>}</SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Period Start</Label>
            <Input type="date" className="h-8 text-xs" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Period End</Label>
            <Input type="date" className="h-8 text-xs" value={periodEnd} min={periodStart} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Deductions ({currencySymbol})</Label>
            <Input type="number" min={0} step="0.01" className="h-8 text-xs" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
          </div>
        </div>
        {selectedEmployee && (
          <p className="mt-2 text-xs text-zinc-500">
            Base salary: <span className="font-medium text-zinc-700">{currencySymbol}{Number(selectedEmployee.salary ?? 0).toLocaleString(currencyLocale)}</span>
            {" · "}Commission rate: <span className="font-medium text-zinc-700">{selectedEmployee.commissionRate ?? 0}%</span>
            {" · "}Commission calculated from completed appointments in the selected period.
          </p>
        )}
        <Button size="sm" className="mt-3" onClick={handleGenerate} disabled={generating}>
          {generating ? "Calculating..." : "Generate Payroll"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-zinc-100 hover:bg-transparent">
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Employee</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Period</TableHead>
            <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Base</TableHead>
            <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Commission</TableHead>
            <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Deductions</TableHead>
            <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Net Pay</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-zinc-400">No payroll records yet.</TableCell></TableRow>
          ) : (
            records.map((r) => (
              <TableRow key={r.id} className={cn("border-zinc-100 hover:bg-zinc-50/50", loading === r.id && "opacity-50")}>
                <TableCell className="text-sm font-medium text-zinc-900">{r.employeeName}</TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {format(new Date(r.periodStart), "MMM d")} – {format(new Date(r.periodEnd), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right text-sm text-zinc-700">{currencySymbol}{Number(r.baseSalary).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right text-sm text-emerald-600">{currencySymbol}{Number(r.commission).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right text-sm text-red-500">{currencySymbol}{Number(r.deductions).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right text-sm font-bold text-zinc-900">{currencySymbol}{Number(r.netPay).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                    STATUS_PILL[r.status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
                  )}>
                    {r.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {r.status === "draft" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatus(r.id, "processed")}>Process</Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-500" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {r.status === "processed" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatus(r.id, "paid")}>Mark Paid</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

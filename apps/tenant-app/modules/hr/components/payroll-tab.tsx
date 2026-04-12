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
  draft: "bg-muted text-muted-foreground border-border",
  processed: "bg-sky-50 text-sky-700 border-sky-200",
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
      <div className="rounded-[24px] border border-border/70 bg-background/70 p-4">
        <p className="eyebrow-label">Payroll</p>
        <p className="mb-3 text-sm font-semibold text-foreground">Generate</p>
        <div key={formKey} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Employee</Label>
            <Select value={employeeId} onValueChange={(v) => { if (v) setEmployeeId(v); }}>
              <SelectTrigger className="h-8 text-xs">{employeeId ? employees.find((e) => e.id === employeeId)?.name : <span className="text-muted-foreground">Select...</span>}</SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Start</Label>
            <Input type="date" className="h-8 text-xs" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">End</Label>
            <Input type="date" className="h-8 text-xs" value={periodEnd} min={periodStart} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Deductions ({currencySymbol})</Label>
            <Input type="number" min={0} step="0.01" className="h-8 text-xs" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
          </div>
        </div>
        {selectedEmployee && (
          <p className="mt-2 text-xs text-muted-foreground">
            Base salary: <span className="font-medium text-foreground">{currencySymbol}{Number(selectedEmployee.salary ?? 0).toLocaleString(currencyLocale)}</span>
            {" · "}Commission rate: <span className="font-medium text-foreground">{selectedEmployee.commissionRate ?? 0}%</span>
            {" · "}Commission calculated from completed appointments in the selected period.
          </p>
        )}
        <Button size="sm" className="mt-3 rounded-full" onClick={handleGenerate} disabled={generating}>
          {generating ? "Calculating..." : "Generate"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Employee</TableHead>
            <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Period</TableHead>
            <TableHead className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground">Base</TableHead>
            <TableHead className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground">Commission</TableHead>
            <TableHead className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground">Deductions</TableHead>
            <TableHead className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground">Net</TableHead>
            <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Status</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">No payroll records yet.</TableCell></TableRow>
          ) : (
            records.map((r) => (
              <TableRow key={r.id} className={cn("border-border/60 hover:bg-muted/20", loading === r.id && "opacity-50")}>
                <TableCell className="text-sm font-medium text-foreground">{r.employeeName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(r.periodStart), "MMM d")} – {format(new Date(r.periodEnd), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right text-sm text-foreground">{currencySymbol}{Number(r.baseSalary).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right text-sm text-emerald-600">{currencySymbol}{Number(r.commission).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right text-sm text-red-500">{currencySymbol}{Number(r.deductions).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right text-sm font-bold text-foreground">{currencySymbol}{Number(r.netPay).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</TableCell>
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
                        <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => handleStatus(r.id, "processed")}>Process</Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {r.status === "processed" && (
                      <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => handleStatus(r.id, "paid")}>Mark Paid</Button>
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

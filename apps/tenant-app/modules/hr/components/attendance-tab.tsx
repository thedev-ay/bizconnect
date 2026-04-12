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
import { cn } from "@/lib/utils";
import { logAttendance } from "../actions";
import type { Employee, AttendanceRecord } from "../types";

interface AttendanceTabProps {
  employees: Employee[];
  records: AttendanceRecord[];
  tenantSlug: string;
  tenantId: string;
}

export function AttendanceTab({ employees, records, tenantSlug, tenantId }: AttendanceTabProps) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [employeeKey, setEmployeeKey] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleLog() {
    if (!employeeId || !date || !clockIn) {
      toast.error("Employee, date, and clock-in time are required");
      return;
    }
    setSaving(true);
    try {
      await logAttendance(
        tenantSlug,
        tenantId,
        employeeId,
        date,
        `${date}T${clockIn}`,
        clockOut ? `${date}T${clockOut}` : undefined,
        undefined
      );
      toast.success("Attendance logged");
      setEmployeeId("");
      setEmployeeKey((k) => k + 1);
      setClockIn("");
      setClockOut("");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to log attendance");
    } finally {
      setSaving(false);
    }
  }

  function hoursWorked(record: AttendanceRecord) {
    if (!record.clockIn || !record.clockOut) return "—";
    const diff = (new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()) / 3600000;
    return `${diff.toFixed(1)}h`;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-border/70 bg-background/70 p-4">
        <p className="eyebrow-label">Attendance</p>
        <p className="mb-3 text-sm font-semibold text-foreground">Log</p>
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Employee</Label>
            <Select key={employeeKey} value={employeeId} onValueChange={(v) => { if (v) setEmployeeId(v); }}>
              <SelectTrigger className="h-8 text-xs">{employeeId ? employees.find((e) => e.id === employeeId)?.name : <span className="text-muted-foreground">Select...</span>}</SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" className="h-8 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Clock In</Label>
            <Input type="time" className="h-8 text-xs" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Clock Out <span className="text-muted-foreground">(optional)</span></Label>
            <Input type="time" className="h-8 text-xs" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button size="sm" className="h-8 w-full rounded-full" onClick={handleLog} disabled={saving}>
              {saving ? "Saving..." : "Log"}
            </Button>
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Employee</TableHead>
            <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Date</TableHead>
            <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">In</TableHead>
            <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Out</TableHead>
            <TableHead className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground">Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No attendance records yet.</TableCell>
            </TableRow>
          ) : (
            records.map((r) => (
              <TableRow key={r.id} className="border-border/60 hover:bg-muted/20">
                <TableCell className="text-sm font-medium text-foreground">{r.employeeName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(r.date), "MMM d, yyyy")}</TableCell>
                <TableCell className="text-sm text-foreground">{r.clockIn ? format(new Date(r.clockIn), "h:mm a") : <span className="text-muted-foreground/50">—</span>}</TableCell>
                <TableCell className={cn("text-sm", r.clockOut ? "text-foreground" : "text-amber-600")}>
                  {r.clockOut ? format(new Date(r.clockOut), "h:mm a") : "Still in"}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-foreground">{hoursWorked(r)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

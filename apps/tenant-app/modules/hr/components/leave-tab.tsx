"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createLeaveRequest, updateLeaveStatus, updateLeaveRequestEndDate } from "../actions";
import type { Employee, LeaveRequest } from "../types";

interface LeaveTabProps {
  employees: Employee[];
  requests: LeaveRequest[];
  tenantSlug: string;
  tenantId: string;
}

const LEAVE_TYPE: Record<string, string> = {
  sick: "Sick Leave",
  vacation: "Vacation",
  personal: "Personal",
  unpaid: "Unpaid",
};

const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

export function LeaveTab({ employees, requests, tenantSlug, tenantId }: LeaveTabProps) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [editingEndDate, setEditingEndDate] = useState("");
  const [editingStartDate, setEditingStartDate] = useState("");

  async function handleSubmit() {
    if (!employeeId || !type || !startDate) {
      toast.error("Employee, type, and start date are required");
      return;
    }
    if (type !== "sick" && !endDate) {
      toast.error("End date is required for this leave type");
      return;
    }
    if (endDate && new Date(endDate) < new Date(startDate)) {
      toast.error("End date must be on or after start date");
      return;
    }
    setSaving(true);
    try {
      await createLeaveRequest(tenantSlug, tenantId, { employeeId, type, startDate, endDate, reason });
      toast.success(type === "sick" ? "Sick leave approved" : "Leave request created");
      setFormKey((k) => k + 1);
      setEmployeeId("");
      setType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create request");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id: string, status: "approved" | "rejected") {
    setLoading(id);
    try {
      await updateLeaveStatus(tenantSlug, tenantId, id, status);
      toast.success(`Leave ${status}`);
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleUpdateEndDate() {
    if (!editingLeaveId || !editingEndDate) {
      toast.error("End date is required");
      return;
    }
    if (new Date(editingEndDate) < new Date(editingStartDate)) {
      toast.error("End date must be on or after start date");
      return;
    }
    setLoading(editingLeaveId);
    try {
      await updateLeaveRequestEndDate(tenantSlug, tenantId, editingLeaveId, editingEndDate);
      toast.success("Leave end date updated");
      setEditDialogOpen(false);
      setEditingLeaveId(null);
      setEditingEndDate("");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update end date");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 p-4">
        <p className="mb-3 text-sm font-semibold text-zinc-900">New Leave Request</p>
        <div key={formKey} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Employee</Label>
            <Select value={employeeId} onValueChange={(v) => { if (v) setEmployeeId(v); }}>
              <SelectTrigger className="h-8 text-xs">
                {employeeId ? employees.find((e) => e.id === employeeId)?.name : <span className="text-muted-foreground">Select...</span>}
              </SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Leave Type</Label>
            <Select value={type} onValueChange={(v) => { if (v) setType(v); }}>
              <SelectTrigger className="h-8 text-xs">
                {type ? LEAVE_TYPE[type] : <span className="text-muted-foreground">Select...</span>}
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAVE_TYPE).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Start Date</Label>
            <Input type="date" className="h-8 text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">End Date {type === "sick" ? <span className="text-zinc-400">(optional)</span> : <span className="text-red-500">*</span>}</Label>
            <Input type="date" className="h-8 text-xs" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs text-zinc-600">Reason <span className="text-zinc-400">(optional)</span></Label>
            <Textarea className="text-xs" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" onClick={handleSubmit} disabled={saving}>{saving ? "Submitting..." : "Submit Request"}</Button>
          </div>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Leave End Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-600">End Date</Label>
              <Input type="date" className="h-8 text-xs" value={editingEndDate} min={editingStartDate} onChange={(e) => setEditingEndDate(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateEndDate} disabled={loading !== null}>{loading !== null ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow className="border-zinc-100 hover:bg-transparent">
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Employee</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Type</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">From</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">To</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Reason</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-zinc-400">No leave requests yet.</TableCell></TableRow>
          ) : (
            requests.map((r) => (
              <TableRow key={r.id} className={cn("border-zinc-100 hover:bg-zinc-50/50", loading === r.id && "opacity-50")}>
                <TableCell className="text-sm font-medium text-zinc-900">{r.employeeName}</TableCell>
                <TableCell className="text-sm text-zinc-700">{LEAVE_TYPE[r.type] ?? r.type}</TableCell>
                <TableCell className="text-sm text-zinc-500">{format(new Date(r.startDate), "MMM d, yyyy")}</TableCell>
                <TableCell className="text-sm text-zinc-500">{r.endDate ? format(new Date(r.endDate), "MMM d, yyyy") : <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell className="max-w-[160px] truncate text-sm text-zinc-400">{r.reason ?? <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                    STATUS_PILL[r.status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
                  )}>
                    {r.status}
                  </span>
                </TableCell>
                <TableCell>
                  {r.status === "pending" && r.type !== "sick" && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700" onClick={() => handleStatus(r.id, "approved")}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleStatus(r.id, "rejected")}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {r.status === "approved" && !r.endDate && (
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => { setEditingLeaveId(r.id); setEditingStartDate(format(new Date(r.startDate), "yyyy-MM-dd")); setEditingEndDate(""); setEditDialogOpen(true); }}>
                      Add End Date
                    </Button>
                  )}
                  {r.status === "approved" && r.endDate && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setEditingLeaveId(r.id); setEditingStartDate(format(new Date(r.startDate), "yyyy-MM-dd")); setEditingEndDate(format(new Date(r.endDate!), "yyyy-MM-dd")); setEditDialogOpen(true); }}>
                      Edit Date
                    </Button>
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

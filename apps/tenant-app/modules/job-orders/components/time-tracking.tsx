"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, Play, Square, Trash2, AlertCircle } from "lucide-react";
import { startTimeLog, endTimeLog, deleteTimeLog, updateTimeLogNotes } from "../actions";
import { cn } from "@/lib/utils";

interface TimeLog {
  id: string;
  taskName: string | null;
  startedAt: Date;
  endedAt: Date | null;
  duration: number | null;
  notes: string | null;
}

interface TimeTrackingProps {
  jobOrderId: string;
  tenantSlug: string;
  tenantId: string;
  timeLogs: TimeLog[];
  onUpdated?: () => void;
}

export function TimeTracking({ jobOrderId, tenantSlug, tenantId, timeLogs, onUpdated }: TimeTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [taskName, setTaskName] = useState("");
  const [editingNotes, setEditingNotes] = useState<{ logId: string; notes: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const activeLog = timeLogs.find((l) => !l.endedAt);

  useEffect(() => {
    setIsTracking(!!activeLog);
    setActiveLogId(activeLog?.id || null);
  }, [activeLog]);

  async function handleStartTracking() {
    if (!taskName.trim()) {
      toast.error("Please enter a task name");
      return;
    }
    setLoading(true);
    try {
      const result = await startTimeLog(tenantSlug, tenantId, jobOrderId, taskName);
      setActiveLogId(result.id);
      setTaskName("");
      setIsTracking(true);
      onUpdated?.();
      toast.success("Time tracking started");
    } catch (error) {
      toast.error("Failed to start time tracking");
    } finally {
      setLoading(false);
    }
  }

  async function handleStopTracking() {
    if (!activeLogId) return;
    setLoading(true);
    try {
      await endTimeLog(tenantSlug, tenantId, activeLogId);
      setIsTracking(false);
      setActiveLogId(null);
      onUpdated?.();
      toast.success("Time tracking stopped");
    } catch (error) {
      toast.error("Failed to end time tracking");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLog(logId: string) {
    if (!confirm("Delete this time log?")) return;
    setLoading(true);
    try {
      await deleteTimeLog(tenantSlug, tenantId, logId);
      onUpdated?.();
      toast.success("Time log deleted");
    } catch (error) {
      toast.error("Failed to delete time log");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateNotes(logId: string, notes: string) {
    try {
      await updateTimeLogNotes(tenantSlug, tenantId, logId, notes);
      setEditingNotes(null);
      onUpdated?.();
      toast.success("Notes updated");
    } catch (error) {
      toast.error("Failed to update notes");
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getTotalHours = () => {
    const total = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    return (total / 3600).toFixed(2);
  };

  return (
    <div className="space-y-4">
      {/* Active timer */}
      {isTracking && activeLog && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 animate-pulse">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {activeLog.taskName || "Untitled task"}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Started {new Date(activeLog.startedAt).toLocaleTimeString("nl-NL", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleStopTracking}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Square className="h-3.5 w-3.5 mr-1.5" />
              Stop
            </Button>
          </div>
        </div>
      )}

      {/* Start new tracking */}
      {!isTracking && (
        <div className="flex gap-2">
          <Input
            placeholder="Task name (optional)"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            disabled={loading}
          />
          <Button
            size="sm"
            onClick={handleStartTracking}
            disabled={loading}
            className="gap-2"
          >
            <Play className="h-3.5 w-3.5" />
            Start
          </Button>
        </div>
      )}

      {/* Total hours */}
      <div className="text-sm text-zinc-600">
        <p>
          Total tracked: <span className="font-semibold">{getTotalHours()} hours</span>
        </p>
      </div>

      {/* Time logs list */}
      {timeLogs.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {timeLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-zinc-200 p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">
                    {log.taskName || "Untitled task"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {new Date(log.startedAt).toLocaleTimeString("nl-NL", { hour: "numeric", minute: "2-digit" })} 
                    {" - "}
                    {log.endedAt 
                      ? new Date(log.endedAt).toLocaleTimeString("nl-NL", { hour: "numeric", minute: "2-digit" })
                      : "ongoing"}
                  </p>
                  {log.duration && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Duration: {formatDuration(log.duration)}
                    </p>
                  )}
                  {log.notes && (
                    <p className="text-xs text-zinc-600 mt-1 italic">{log.notes}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setEditingNotes({ logId: log.id, notes: log.notes || "" })}
                  >
                    ✏️
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteLog(log.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Clock className="h-8 w-8 text-zinc-300 mb-2" />
          <p className="text-xs text-zinc-400">No time logs yet</p>
        </div>
      )}

      {/* Edit notes dialog */}
      {editingNotes && (
        <Dialog open={!!editingNotes} onOpenChange={() => setEditingNotes(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Notes</DialogTitle>
            </DialogHeader>
            <Input
              value={editingNotes.notes}
              onChange={(e) => setEditingNotes({ ...editingNotes, notes: e.target.value })}
              placeholder="Add notes..."
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingNotes(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleUpdateNotes(editingNotes.logId, editingNotes.notes)}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

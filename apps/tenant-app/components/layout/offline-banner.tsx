"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="flex items-center gap-2 border-b border-amber-200/80 bg-[linear-gradient(90deg,rgba(251,191,36,0.92),rgba(245,158,11,0.96))] px-4 py-2.5 text-sm font-medium text-amber-950 shadow-[0_10px_24px_-20px_rgba(146,64,14,0.9)]">
      <WifiOff className="h-4 w-4 shrink-0" />
      You're offline. Some features are limited. Changes will sync when you reconnect.
    </div>
  );
}

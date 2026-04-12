"use client";

import { useEffect, useState } from "react";
import { getPendingSaleCount } from "@/lib/offline-sale";

interface PendingSalesBadgeProps {
  tenantId: string;
}

export function PendingSalesBadge({ tenantId }: PendingSalesBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function refresh() {
      setCount(await getPendingSaleCount(tenantId));
    }

    refresh();

    // Refresh when an offline sale is queued or flushed
    window.addEventListener("offline-sale-queued", refresh);
    window.addEventListener("offline-sale-flushed", refresh);
    // Also refresh on reconnect (flush may have cleared the queue)
    window.addEventListener("online", refresh);

    return () => {
      window.removeEventListener("offline-sale-queued", refresh);
      window.removeEventListener("offline-sale-flushed", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [tenantId]);

  if (count === 0) return null;

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full border border-amber-200 bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800 shadow-[0_8px_16px_-12px_rgba(180,83,9,0.75)]">
      {count}
    </span>
  );
}

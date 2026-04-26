"use client";

import { useEffect, useState } from "react";
import { db } from "./local-db";

function formatAge(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function useSyncAge(key: string, staleAfterMs = 5 * 60 * 1000): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const record = await db.syncMeta.get(key);
      if (cancelled || !record) return;
      const age = Date.now() - record.syncedAt;
      setLabel(age >= staleAfterMs ? formatAge(age) : null);
    }

    check();
    const interval = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [key, staleAfterMs]);

  return label;
}

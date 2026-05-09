"use client";

import { useTopbarPage } from "./topbar-cta-context";

interface TopbarPageBridgeProps {
  title: string;
  description?: string;
}

export function TopbarPageBridge({ title, description }: TopbarPageBridgeProps) {
  useTopbarPage({ title, description });
  return null;
}

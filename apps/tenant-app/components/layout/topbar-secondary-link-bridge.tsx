"use client";

import { useRouter } from "next/navigation";
import { useTopbarSecondaryCta } from "./topbar-cta-context";

interface TopbarSecondaryLinkBridgeProps {
  label: string;
  href: string;
}

export function TopbarSecondaryLinkBridge({ label, href }: TopbarSecondaryLinkBridgeProps) {
  const router = useRouter();

  useTopbarSecondaryCta(label, () => {
    router.push(href);
  });

  return null;
}

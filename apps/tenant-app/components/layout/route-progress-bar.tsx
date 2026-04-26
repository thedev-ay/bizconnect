"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export function RouteProgressBar() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const doneTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === prevPathname.current) return;
      } catch {
        return;
      }
      clearTimeout(doneTimer.current);
      setPhase("loading");
    }
    document.addEventListener("click", onLinkClick);
    return () => document.removeEventListener("click", onLinkClick);
  }, []);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setPhase((current) => {
        if (current === "loading") {
          doneTimer.current = setTimeout(() => setPhase("idle"), 450);
          return "done";
        }
        return current;
      });
    }
    return () => clearTimeout(doneTimer.current);
  }, [pathname]);

  return (
    <AnimatePresence>
      {phase !== "idle" && (
        <motion.div
          key="bar"
          className="fixed left-0 top-0 z-[200] h-[2px] bg-primary"
          initial={{ width: "0%", opacity: 1 }}
          animate={{ width: phase === "done" ? "100%" : "72%" }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          transition={
            phase === "done"
              ? { duration: 0.18, ease: "easeIn" }
              : { duration: 2.2, ease: [0.08, 0.5, 0.15, 1] }
          }
        />
      )}
    </AnimatePresence>
  );
}

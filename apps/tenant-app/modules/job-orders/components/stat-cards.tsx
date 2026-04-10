"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Waves, CheckCircle, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function AnimatedNumber({ value, className }: { value: number; className: string }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 22, stiffness: 180 });
  const rounded = useTransform(spring, Math.round);

  useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  return <motion.span className={className}>{rounded}</motion.span>;
}

interface StatCardsProps {
  active: number;
  completedToday: number;
  receivedToday: number;
}

const STATS = [
  { key: "active" as const,          label: "Active",          icon: Waves,        color: "text-blue-600", bg: "bg-blue-50"   },
  { key: "completedToday" as const,  label: "Completed Today", icon: CheckCircle,  color: "text-zinc-600", bg: "bg-zinc-100"  },
  { key: "receivedToday" as const,   label: "Received Today",  icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50" },
];

export function StatCards({ active, completedToday, receivedToday }: StatCardsProps) {
  const values = { active, completedToday, receivedToday };

  return (
    <div className="grid gap-3 sm:grid-cols-3 shrink-0">
      {STATS.map(({ key, label, icon: Icon, color, bg }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.28, ease: "easeOut" }}
        >
          <Card className="shadow-none border-zinc-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500">{label}</p>
                  <AnimatedNumber
                    value={values[key]}
                    className={`mt-1 text-2xl font-bold block ${color}`}
                  />
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

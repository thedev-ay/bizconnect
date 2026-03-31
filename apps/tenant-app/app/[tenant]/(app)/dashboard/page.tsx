import { auth } from "@/lib/auth";
import { getActiveModules } from "@/lib/module-registry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface DashboardPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { tenant: tenantSlug } = await params;
  const { error } = await searchParams;

  const [session, activeModules] = await Promise.all([
    auth(),
    getActiveModules(tenantSlug),
  ]);

  return (
    <div className="space-y-6">
      {error === "module_disabled" && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          That module is not available on your current plan. Contact your administrator.
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Good {getTimeGreeting()}, {session?.user?.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s available in your workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeModules.map((module) => {
          const Icon = module.icon
            ? ((Icons as Record<string, unknown>)[module.icon] as LucideIcon)
            : null;

          return (
            <Link key={module.slug} href={`/${tenantSlug}/${module.slug}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  {Icon && (
                    <div className="rounded-md bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{module.name}</CardTitle>
                    {module.isCore && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Core
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Go to {module.name}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

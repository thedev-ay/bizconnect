import { prisma } from "@bizconnect/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Puzzle, TrendingUp } from "lucide-react";

async function getStats() {
  const [totalTenants, activeTenants, totalUsers, totalModuleActivations] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isSuperAdmin: false } }),
    prisma.tenantModule.count({ where: { isEnabled: true } }),
  ]);

  return { totalTenants, activeTenants, totalUsers, totalModuleActivations };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      title: "Total Tenants",
      value: stats.totalTenants,
      sub: `${stats.activeTenants} active`,
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      sub: "Across all tenants",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Module Activations",
      value: stats.totalModuleActivations,
      sub: "Enabled across tenants",
      icon: Puzzle,
      color: "text-purple-600",
    },
    {
      title: "Active Rate",
      value:
        stats.totalTenants > 0
          ? `${Math.round((stats.activeTenants / stats.totalTenants) * 100)}%`
          : "0%",
      sub: "Tenants active",
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="admin-surface px-6 py-5">
        <p className="admin-eyebrow">Platform</p>
        <h1 className="admin-page-title mt-2">Overview</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tenants, users, and module usage.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-primary/70">
                    {card.title}
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/55">
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-[-0.05em]">{card.value}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{card.sub}</p>
                </CardContent>
              </Card>
          );
        })}
      </div>
    </div>
  );
}

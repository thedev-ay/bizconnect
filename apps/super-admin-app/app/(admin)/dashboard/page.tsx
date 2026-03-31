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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground">Welcome to the BizConnect admin panel.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { prisma } from "@bizconnect/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lock } from "lucide-react";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

async function getModules() {
  return prisma.module.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { tenantModules: { where: { isEnabled: true } } },
      },
    },
  });
}

export default async function ModulesPage() {
  const modules = await getModules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Modules</h1>
        <p className="text-muted-foreground">
          All available modules. Enable them per-tenant from the tenant management page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{modules.length} Modules Available</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Active Tenants</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((mod) => {
                const Icon = mod.icon
                  ? ((Icons as Record<string, unknown>)[mod.icon] as LucideIcon)
                  : null;
                return (
                  <TableRow key={mod.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        {mod.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{mod.slug}</code>
                    </TableCell>
                    <TableCell>
                      {mod.isCore ? (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Lock className="h-2.5 w-2.5" />
                          Core
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mod.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {mod._count.tenantModules}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

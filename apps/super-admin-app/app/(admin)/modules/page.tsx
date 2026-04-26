import { prisma } from "@bizconnect/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lock, Tag } from "lucide-react";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import { DependencyGraphLoader } from "@/components/modules/dependency-graph-loader";

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
    <div className="space-y-5">
      <div className="admin-surface px-6 py-5">
        <p className="admin-eyebrow">Platform</p>
        <h1 className="admin-page-title mt-2">Modules</h1>
        <p className="mt-2 text-sm text-muted-foreground">Inventory of platform capabilities.</p>
      </div>

      <Card>
        <CardHeader className="border-b border-border/60 py-4">
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
                  <TableRow key={mod.id} className="hover:bg-muted/28">
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-2 font-medium">
                        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        {mod.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded-full bg-muted px-2 py-1 font-mono text-[11px] text-foreground/75">
                        {mod.slug}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mod.isCore ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Lock className="h-2.5 w-2.5" />
                          Core
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-primary/70" />
                          Optional
                        </span>
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

      <Card>
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-base">Module mapping</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <DependencyGraphLoader />
        </CardContent>
      </Card>
    </div>
  );
}

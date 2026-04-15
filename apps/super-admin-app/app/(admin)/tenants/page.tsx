import { prisma } from "@bizconnect/db";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, Building2, Users, Puzzle, Sparkles } from "lucide-react";
import { CreateTenantDialog } from "@/components/tenants/create-tenant-dialog";

async function getTenants() {
  return prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, tenantModules: { where: { isEnabled: true } } } },
    },
  });
}

export default async function TenantsPage() {
  const tenants = await getTenants();

  return (
    <div className="space-y-5">
      <div className="admin-surface flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="admin-eyebrow">Platform</p>
          <h1 className="admin-page-title mt-2">Tenants</h1>
          <p className="mt-2 text-sm text-muted-foreground">Provisioned businesses and access.</p>
        </div>
        <CreateTenantDialog />
      </div>

      <div className="grid gap-4 sm:hidden">
        {tenants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No tenants yet.
            </CardContent>
          </Card>
        ) : (
          tenants.map((tenant) => (
            <Card key={tenant.id}>
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                      <Building2 className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold tracking-[-0.02em] text-foreground">{tenant.name}</p>
                      <code className="mt-1 inline-flex rounded-full border border-border/70 bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        /{tenant.slug}
                      </code>
                    </div>
                  </div>
                  <Badge variant={tenant.isActive ? "default" : "secondary"}>
                    {tenant.isActive ? "Active" : "Suspended"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Plan</p>
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted px-2 py-1 font-medium capitalize text-foreground">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {tenant.plan}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Users</p>
                    <p className="mt-1 font-medium text-foreground">{tenant._count.users}</p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Modules</p>
                    <p className="mt-1 font-medium text-foreground">{tenant._count.tenantModules}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                  </p>
                  <Link href={`/tenants/${tenant.id}`}>
                    <Button size="sm" variant="outline" className="rounded-full border-border/70 bg-background shadow-none">
                      Manage <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="hidden sm:flex">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-base">All Tenants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Business</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No tenants yet. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id} className="hover:bg-muted/28">
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(tenant.createdAt), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded-full border border-border/70 bg-muted px-2.5 py-1 text-xs text-muted-foreground">{tenant.slug}</code>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">
                        <Sparkles className="h-3 w-3 text-primary" />
                        {tenant.plan}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {tenant._count.users}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Puzzle className="h-3.5 w-3.5 text-muted-foreground" />
                        {tenant._count.tenantModules}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.isActive ? "default" : "secondary"}>
                        {tenant.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Link href={`/tenants/${tenant.id}`}>
                        <Button variant="outline" size="sm" className="rounded-full border-border/70 bg-background shadow-none">
                          Manage <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

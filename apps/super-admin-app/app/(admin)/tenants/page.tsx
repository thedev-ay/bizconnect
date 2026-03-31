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
import { Plus, ChevronRight } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">{tenants.length} businesses registered</p>
        </div>
        <CreateTenantDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Tenants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Active Modules</TableHead>
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
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{tenant.slug}</code>
                    </TableCell>
                    <TableCell className="capitalize">{tenant.plan}</TableCell>
                    <TableCell>{tenant._count.users}</TableCell>
                    <TableCell>{tenant._count.tenantModules}</TableCell>
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
                        <Button variant="ghost" size="sm">
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

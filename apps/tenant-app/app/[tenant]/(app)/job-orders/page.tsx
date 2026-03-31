import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobOrderList, CreateJobOrderDialog } from "@/modules/job-orders";
import type { JobOrder } from "@/modules/job-orders";
import { ClipboardList, PlayCircle, CheckCircle, AlertCircle } from "lucide-react";

interface JobOrdersPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function JobOrdersPage({ params }: JobOrdersPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  const jobOrders = await prisma.jobOrder.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });

  const pending = jobOrders.filter((j) => j.status === "pending").length;
  const inProgress = jobOrders.filter((j) => j.status === "in-progress").length;
  const completed = jobOrders.filter((j) => j.status === "completed").length;
  const overdue = jobOrders.filter(
    (j) =>
      j.status !== "completed" &&
      j.status !== "cancelled" &&
      j.dueDate &&
      new Date(j.dueDate) < new Date()
  ).length;

  const typedJobOrders: JobOrder[] = jobOrders;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Orders</h1>
          <p className="text-muted-foreground">{jobOrders.length} total</p>
        </div>
        <CreateJobOrderDialog tenantSlug={tenantSlug} tenantId={tenant.id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <PlayCircle className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdue}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Job Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <JobOrderList jobOrders={typedJobOrders} tenantSlug={tenantSlug} tenantId={tenant.id} />
        </CardContent>
      </Card>
    </div>
  );
}

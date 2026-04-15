import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div className="admin-surface px-6 py-5">
        <p className="admin-eyebrow">Platform</p>
        <h1 className="admin-page-title mt-2">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Platform configuration.</p>
      </div>

      <Card>
        <CardHeader className="border-b border-border/60">
          <CardTitle>Platform Info</CardTitle>
          <CardDescription>Core platform settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">Platform Name</span>
            <span className="font-medium">BizConnect</span>
          </div>
          <Separator />
          <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">Tenant URL Pattern</span>
            <code className="rounded-full border border-border/70 bg-muted px-2 py-0.5 text-xs">
              app.bizconnect.app/[slug]/dashboard
            </code>
          </div>
          <Separator />
          <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Platform configuration and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Info</CardTitle>
          <CardDescription>General platform settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Platform Name</span>
            <span className="font-medium">BizConnect</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tenant URL Pattern</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              app.bizconnect.app/[slug]/dashboard
            </code>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

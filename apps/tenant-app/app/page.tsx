import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">BizConnect</CardTitle>
          <CardDescription>
            Navigate to your workspace: <code>/[your-slug]/dashboard</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Contact your administrator for access.
        </CardContent>
      </Card>
    </div>
  );
}

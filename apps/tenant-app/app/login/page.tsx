import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">BizConnect</CardTitle>
          <CardDescription>Please use your workspace login link.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Navigate to <code>/[your-slug]/login</code> to sign in.
        </CardContent>
      </Card>
    </div>
  );
}

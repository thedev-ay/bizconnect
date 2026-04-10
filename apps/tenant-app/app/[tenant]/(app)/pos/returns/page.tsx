import { redirect } from "next/navigation";

interface ReturnsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ReturnsPage({ params }: ReturnsPageProps) {
  const { tenant: tenantSlug } = await params;
  redirect(`/${tenantSlug}/sales`);
}

import { redirect } from "next/navigation";

interface SalesPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function SalesPage({ params }: SalesPageProps) {
  const { tenant: tenantSlug } = await params;
  redirect(`/${tenantSlug}/sales`);
}

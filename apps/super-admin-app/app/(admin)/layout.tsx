import { Sidebar } from "@/components/layout/sidebar";
import { Providers } from "@/components/providers";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen items-stretch bg-transparent">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">{children}</main>
      </div>
    </Providers>
  );
}

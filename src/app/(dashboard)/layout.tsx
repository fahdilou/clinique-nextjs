import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar userName={user.nom} userRole={user.role} />
      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

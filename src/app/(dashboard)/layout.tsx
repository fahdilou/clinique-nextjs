import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar userName={user.nom} userRole={user.role} />
      {/* Décale le contenu : desktop = sidebar 64, mobile = header top 56 (14 * 4 = 56px) */}
      <main className="md:pl-64 pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 md:py-8">{children}</div>
      </main>
    </div>
  );
}

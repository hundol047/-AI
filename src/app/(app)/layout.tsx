import { Sidebar, MobileTabBar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="pb-16 md:ml-56 md:pb-0">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
      <MobileTabBar />
    </div>
  );
}

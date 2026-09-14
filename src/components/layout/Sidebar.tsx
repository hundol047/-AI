"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, ListTree, FlaskConical, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/traces", label: "Traces", icon: ListTree },
  { href: "/playground", label: "Playground", icon: FlaskConical },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-white/[0.06] bg-bg-panel/80 backdrop-blur-xl md:flex">
      <Link href="/" className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan to-blue text-bg">
          <Activity size={18} strokeWidth={2.5} />
        </span>
        <span className="text-base font-bold tracking-tight text-white">
          Trace<span className="text-gradient">Agent</span>
        </span>
      </Link>

      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border border-cyan/25 bg-cyan/[0.08] text-cyan"
                  : "border border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/85"
              )}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] px-5 py-4 text-[11px] text-white/30">
        A MORE RELIABLE
        <br />
        AI WORLD
      </div>
    </aside>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/[0.08] bg-bg-panel/95 backdrop-blur-xl md:hidden">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
              active ? "text-cyan" : "text-white/40"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

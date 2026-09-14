import Link from "next/link";
import { Activity } from "lucide-react";

const LINKS = [
  { href: "#product", label: "제품 소개" },
  { href: "#features", label: "주요 기능" },
  { href: "#use-cases", label: "활용 사례" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan to-blue text-bg">
            <Activity size={18} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            Trace<span className="text-gradient">Agent</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-white/60 transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>

        <Link href="/playground" className="btn-primary !px-4 !py-2 text-xs sm:!px-5 sm:!py-2.5 sm:text-sm">
          지금 시작하기
        </Link>
      </div>
    </header>
  );
}

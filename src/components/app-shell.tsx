import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  FolderKanban,
  Home,
  Lightbulb,
  RefreshCw,
  Settings,
  Table2,
} from "lucide-react";

const navItems = [
  { href: "/", label: "대시보드", icon: Home },
  { href: "/transactions", label: "거래내역", icon: Table2 },
  { href: "/analytics", label: "분석", icon: BarChart3 },
  { href: "/insights", label: "인사이트", icon: Lightbulb },
  { href: "/recurring", label: "고정지출", icon: CalendarClock },
  { href: "/categories", label: "카테고리", icon: FolderKanban },
  { href: "/sync", label: "동기화", icon: RefreshCw },
  { href: "/settings", label: "설정", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-base font-semibold">
            통합가계부
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:grid-cols-[180px_1fr]">
        <aside className="hidden md:block">
          <nav className="sticky top-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

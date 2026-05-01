"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BookOpen, ShoppingCart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Planning", icon: CalendarDays },
  { href: "/recipes", label: "Recettes", icon: BookOpen },
  { href: "/shopping", label: "Courses", icon: ShoppingCart },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex sticky top-0 h-dvh w-60 shrink-0 flex-col border-r border-border bg-card-warm/60 backdrop-blur-xl px-4 py-6"
      aria-label="Navigation principale"
    >
      <div className="px-2 mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1">
          Eat Scheduler
        </p>
        <p className="text-lg font-black tracking-tight">Mes repas</p>
      </div>

      <ul className="flex flex-col gap-1 flex-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "group flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon
                  className="size-5 shrink-0"
                  strokeWidth={active ? 2.5 : 2}
                />
                <span>{label}</span>
                {active && (
                  <span className="ml-auto size-1.5 rounded-full bg-primary" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium transition-colors",
          pathname.startsWith("/settings")
            ? "bg-primary-soft text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Settings className="size-5 shrink-0" strokeWidth={2} />
        <span>Réglages</span>
      </Link>
    </aside>
  );
}

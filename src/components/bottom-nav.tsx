"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BookOpen, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Planning", icon: CalendarDays },
  { href: "/recipes", label: "Recettes", icon: BookOpen },
  { href: "/shopping", label: "Courses", icon: ShoppingCart },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 pointer-events-none"
      aria-label="Navigation principale"
    >
      <div className="pointer-events-auto max-w-md mx-auto rounded-[var(--radius-lg)] border border-border-strong/60 bg-card/85 backdrop-blur-xl shadow-lift">
        <ul className="grid grid-cols-3">
          {items.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "group relative flex flex-col items-center gap-0.5 py-2.5 px-2 text-[11px] transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary transition-all duration-300",
                      active ? "opacity-100 scale-100" : "opacity-0 scale-50"
                    )}
                  />
                  <span
                    className={cn(
                      "relative flex items-center justify-center size-9 rounded-xl transition-all duration-200",
                      active
                        ? "bg-primary-soft text-primary"
                        : "group-hover:bg-muted"
                    )}
                  >
                    <Icon
                      className="size-5"
                      strokeWidth={active ? 2.5 : 2}
                    />
                  </span>
                  <span className={cn("mt-0.5 transition-all", active && "font-semibold")}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

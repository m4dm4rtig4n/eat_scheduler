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
      className="sticky bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale"
    >
      <ul className="grid grid-cols-3 max-w-2xl mx-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 px-2 text-xs transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                <span className={cn(active && "font-medium")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  BookOpen,
  ShoppingCart,
  Settings,
  Star,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Planning", icon: CalendarDays },
  { href: "/recipes", label: "Recettes", icon: BookOpen },
  { href: "/favorites", label: "Favoris hebdo", icon: Star },
  { href: "/shopping", label: "Courses", icon: ShoppingCart },
];

const STORAGE_KEY = "eat-sidenav-collapsed";

export function SideNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Lecture de la préférence après mount pour éviter les mismatchs SSR/CSR
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "hidden md:flex sticky top-0 h-dvh shrink-0 flex-col border-r border-border bg-card-warm/60 backdrop-blur-xl py-6 transition-[width] duration-200 ease-out",
        collapsed ? "w-16 px-2" : "w-60 px-4"
      )}
      aria-label="Navigation principale"
    >
      {/* Header avec branding (caché en collapsed) + toggle */}
      <div
        className={cn(
          "mb-8 flex items-start",
          collapsed ? "justify-center px-0" : "justify-between px-2"
        )}
      >
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1">
              Eat Scheduler
            </p>
            <p className="text-lg font-black tracking-tight">Mes repas</p>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className="size-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label={collapsed ? "Étendre le menu" : "Réduire le menu"}
          aria-expanded={!collapsed}
          title={collapsed ? "Étendre" : "Réduire"}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <ChevronsLeft className="size-4" />
          )}
        </button>
      </div>

      <ul className="flex flex-col gap-1 flex-1">
        {items.map(({ href, label, icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <NavItem
                href={href}
                label={label}
                icon={icon}
                active={active}
                collapsed={collapsed}
              />
            </li>
          );
        })}
      </ul>

      <NavItem
        href="/settings"
        label="Réglages"
        icon={Settings}
        active={pathname.startsWith("/settings")}
        collapsed={collapsed}
      />
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex items-center h-11 rounded-lg text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "bg-primary-soft text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {active && (
            <span className="ml-auto size-1.5 rounded-full bg-primary shrink-0" />
          )}
        </>
      )}
    </Link>
  );
}

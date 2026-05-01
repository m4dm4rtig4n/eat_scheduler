"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  BookOpen,
  ShoppingCart,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Planning", icon: CalendarDays },
  { href: "/recipes", label: "Recettes", icon: BookOpen },
  { href: "/shopping", label: "Courses", icon: ShoppingCart },
];

/**
 * Drawer de navigation pour mobile (md-).
 * Sur desktop (md+), c'est <SideNav> qui prend le relais et ce composant est caché.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Ferme automatiquement le drawer quand l'utilisateur navigue
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Ferme avec Échap, et bloque le scroll body quand ouvert
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Bouton hamburger : fixe en haut à gauche, sous le notch éventuel */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-[max(env(safe-area-inset-top),0.5rem)] left-3 z-40 inline-flex items-center justify-center size-10 rounded-lg bg-card/85 backdrop-blur-xl border border-border-strong/60 text-foreground shadow-soft hover:bg-card transition-colors"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        aria-controls="mobile-drawer"
      >
        <Menu className="size-5" />
      </button>

      {/* Backdrop + drawer */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-50 transition-opacity",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
          aria-label="Fermer le menu"
          tabIndex={open ? 0 : -1}
        />
        <aside
          id="mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation principale"
          className={cn(
            "absolute top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-card-warm border-r border-border shadow-lift flex flex-col px-4 py-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)] transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1">
                Eat Scheduler
              </p>
              <p className="text-lg font-black tracking-tight">Mes repas</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="size-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Fermer"
            >
              <X className="size-5" />
            </button>
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
                      "flex items-center gap-3 px-3 h-12 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-primary-soft text-primary"
                        : "text-foreground-soft hover:bg-muted hover:text-foreground"
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
              "flex items-center gap-3 px-3 h-12 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-primary-soft text-primary"
                : "text-foreground-soft hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="size-5 shrink-0" />
            <span>Réglages</span>
          </Link>
        </aside>
      </div>
    </>
  );
}

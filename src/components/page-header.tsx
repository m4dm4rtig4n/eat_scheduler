import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 border-b border-border/70">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {back}
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

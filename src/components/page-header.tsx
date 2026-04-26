import { ReactNode } from "react";

export function PageHeader({
  title,
  action,
  back,
}: {
  title: string;
  action?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="flex items-center justify-between gap-3 px-4 py-3 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {back}
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </div>
        {action}
      </div>
    </header>
  );
}

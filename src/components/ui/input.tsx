import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldClasses =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground transition-all shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("h-11", fieldClasses, className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn("min-h-24 resize-y", fieldClasses, className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = ({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) => (
  <label
    htmlFor={htmlFor}
    className={cn(
      "block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5",
      className
    )}
  >
    {children}
  </label>
);

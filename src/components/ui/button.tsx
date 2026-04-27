import { forwardRef, ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none active:translate-y-px select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-soft hover:shadow-lift hover:brightness-105",
        secondary:
          "bg-card-warm text-foreground border border-border hover:border-border-strong hover:bg-muted shadow-soft",
        ghost:
          "text-foreground-soft hover:bg-muted hover:text-foreground",
        outline:
          "border border-border-strong bg-card/60 backdrop-blur hover:bg-card text-foreground shadow-soft",
        accent:
          "bg-accent text-accent-foreground hover:brightness-95 shadow-soft",
        destructive:
          "bg-danger text-white hover:brightness-110 shadow-soft",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-7 text-base rounded-[var(--radius-lg)]",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };

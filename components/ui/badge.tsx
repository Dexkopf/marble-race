import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-purple-900/40 text-purple-300 border border-purple-700/40",
        secondary: "bg-white/[0.06] text-slate-400 border border-white/10",
        success: "bg-emerald-900/30 text-emerald-400 border border-emerald-800/40",
        warning: "bg-amber-900/30 text-amber-400 border border-amber-800/40",
        danger: "bg-rose-900/30 text-rose-400 border border-rose-800/40",
        live: "bg-emerald-900/20 text-emerald-400 border border-emerald-700/30 animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

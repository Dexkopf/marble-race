import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-body font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-purple-700 text-purple-50 border border-purple-600 hover:bg-purple-600 shadow-lg shadow-purple-900/30",
        outline:
          "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-slate-100",
        ghost:
          "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
        danger:
          "bg-rose-900/30 border border-rose-800/50 text-rose-400 hover:bg-rose-800/40",
        success:
          "bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 hover:bg-emerald-800/40",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-5",
        lg: "h-12 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

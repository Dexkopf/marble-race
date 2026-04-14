import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-white/10 bg-[#0d0d16] px-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 font-body transition-all",
          "focus:outline-none focus:border-purple-500/50 focus:shadow-[0_0_0_2px_rgba(124,58,237,0.2)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

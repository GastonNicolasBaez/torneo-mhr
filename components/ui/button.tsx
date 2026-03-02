"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-orange-500 text-zinc-950 hover:bg-orange-400 shadow-lg shadow-orange-500/20",
        secondary:
          "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700",
        outline:
          "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800",
        ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
        destructive:
          "bg-red-600 text-white hover:bg-red-500",
        green:
          "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20",
        neon:
          "border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-zinc-950 transition-colors",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
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

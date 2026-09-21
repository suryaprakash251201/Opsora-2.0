import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-colors focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-sky-400/15 text-sky-200 border border-sky-400/25 hover:bg-sky-400/25",
        secondary: "bg-white/5 text-zinc-200 border border-white/10 hover:bg-white/10",
        ghost: "text-zinc-300 hover:bg-white/5 hover:text-zinc-100",
        danger: "bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/25",
        subtle: "text-zinc-400 hover:text-zinc-100 hover:bg-white/5",
      },
      size: {
        sm: "h-7 px-2.5",
        default: "h-8 px-3",
        lg: "h-9 px-4",
        icon: "h-8 w-8",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps): React.JSX.Element {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

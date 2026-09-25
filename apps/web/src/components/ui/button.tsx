import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-all duration-150 focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-accent/40 bg-accent text-accent-ink shadow-sm shadow-accent/10 hover:border-accent/60 hover:bg-accent-strong hover:shadow-md hover:shadow-accent/15",
        secondary:
          "border border-edge/80 bg-panel-2/80 text-ink shadow-sm hover:border-accent/35 hover:bg-hover",
        ghost: "text-ink-2 hover:bg-hover hover:text-ink",
        danger:
          "border border-rose-500/30 bg-rose-500/10 text-rose-700 hover:border-rose-500/45 hover:bg-rose-500/20 dark:text-rose-300",
        subtle: "text-ink-3 hover:bg-hover hover:text-ink",
      },
      size: {
        sm: "h-8 px-3",
        default: "h-9 px-3.5",
        lg: "h-10 px-4",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
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

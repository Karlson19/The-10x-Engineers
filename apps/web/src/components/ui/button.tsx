import { Loader2 } from "lucide-react";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Copper marks the single most important action on a screen. Everything else is
 * pine, outline, ghost or a plain text link. Two copper buttons competing in
 * one view is a bug.
 *
 * Press and hover are CSS transforms rather than JavaScript, so no animation
 * library sits on the critical path of a form.
 */
const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap",
    "transition-[transform,background-color,border-color,color] duration-100 ease-out",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60",
    "motion-reduce:transition-none motion-reduce:active:scale-100",
  ),
  {
    variants: {
      variant: {
        accent: "bg-accent text-accent-foreground hover:bg-accent-hover hover:-translate-y-px",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover hover:-translate-y-px",
        outline:
          "border border-input bg-transparent text-foreground hover:border-foreground/40 hover:bg-muted hover:-translate-y-px",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        link: "px-0 text-foreground underline decoration-accent decoration-2 underline-offset-[6px] hover:decoration-foreground active:scale-100",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110 hover:-translate-y-px",
      },
      size: {
        // 44px minimum, because these are tapped with a thumb.
        default: "min-h-12 px-6 text-base",
        sm: "min-h-11 px-4 text-sm",
        icon: "size-11 p-0",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "default", block: false },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Swaps the label for a spinner without changing the button's width. */
    isPending?: boolean;
    pendingLabel?: string;
  };

export function Button({
  className,
  variant,
  size,
  block,
  isPending = false,
  pendingLabel,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || isPending}
      aria-busy={isPending}
      {...props}
    >
      {isPending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
          <span>{pendingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export { buttonVariants };

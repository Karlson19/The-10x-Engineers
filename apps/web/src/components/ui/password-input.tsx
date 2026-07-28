"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * A password field you can actually read back. Typing a long password on a
 * phone keyboard without being able to check it is the single most common
 * reason people fail to sign in.
 *
 * The toggle is a real button, so it is reachable by keyboard, and it announces
 * its state rather than relying on the icon alone.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={isVisible ? "text" : "password"}
          className={cn(
            "min-h-12 w-full rounded-lg border border-input bg-card px-3.5 pr-12 text-base text-foreground",
            "placeholder:text-muted-foreground/70",
            "transition-colors duration-150 motion-reduce:transition-none",
            "hover:border-foreground/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
            "aria-[invalid=true]:border-destructive aria-[invalid=true]:hover:border-destructive",
            className,
          )}
          {...props}
        />

        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          // Deliberately outside the tab order between the field and the submit
          // button: it is a convenience, not a step in filling the form.
          tabIndex={-1}
          className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {isVisible ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
        </button>
      </div>
    );
  },
);

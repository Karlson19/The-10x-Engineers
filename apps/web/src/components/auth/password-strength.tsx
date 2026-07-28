"use client";

import { Check, X } from "lucide-react";
import { PASSWORD_RULES, passwordStrength } from "@chrysmec/shared";
import { cn } from "@/lib/utils";

const BAR_TONE = ["bg-border", "bg-destructive", "bg-warning", "bg-success", "bg-success"] as const;

/**
 * Shows what the password still needs, live, rather than waiting for a failed
 * submit to say "include at least one number". The rules come from the shared
 * package, the same list the server validates against.
 */
export function PasswordStrength({ value, id }: { value: string; id: string }) {
  const strength = passwordStrength(value);
  const isEmpty = value.length === 0;

  return (
    <div id={id} className="mt-2">
      <div className="flex items-center gap-3">
        <div
          className="flex h-1 flex-1 gap-1"
          role="meter"
          aria-valuenow={strength.score}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-label="Password strength"
        >
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={cn(
                "h-full flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none",
                segment <= strength.score ? BAR_TONE[strength.score] : "bg-border",
              )}
            />
          ))}
        </div>

        <span
          className={cn(
            "w-24 shrink-0 text-right font-mono text-xs tracking-[0.1em] uppercase",
            strength.meetsRequirements ? "text-success" : "text-muted-foreground",
          )}
        >
          {isEmpty ? "" : strength.label}
        </span>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(value);

          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-sm",
                met ? "text-success" : "text-muted-foreground",
              )}
            >
              {met ? (
                <Check aria-hidden size={14} strokeWidth={3} />
              ) : (
                <X aria-hidden size={14} strokeWidth={2.5} className="opacity-50" />
              )}
              <span>{rule.label}</span>
              <span className="sr-only">{met ? ", done" : ", still needed"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { Check } from "lucide-react";
import type { SymptomOption } from "@chrysmec/shared";
import { cn } from "@/lib/utils";

/**
 * Large tappable cards rather than small native radios and checkboxes, because
 * these are answered on a phone while standing next to a car. Real inputs sit
 * underneath so keyboard and screen reader behaviour is the browser's.
 */
export function ChoiceGroup({
  name,
  options,
  value,
  multiple = false,
  invalid = false,
  describedBy,
  onChange,
}: {
  name: string;
  options: readonly SymptomOption[];
  value: string | string[] | undefined;
  multiple?: boolean;
  invalid?: boolean;
  describedBy?: string | undefined;
  onChange: (next: string | string[]) => void;
}) {
  const selected = new Set(
    value === undefined ? [] : Array.isArray(value) ? value : [value],
  );

  function toggle(optionValue: string): void {
    if (!multiple) {
      onChange(optionValue);
      return;
    }

    const next = new Set(selected);
    if (next.has(optionValue)) {
      next.delete(optionValue);
    } else {
      next.add(optionValue);
    }
    onChange([...next]);
  }

  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className="grid gap-2 sm:grid-cols-2"
    >
      {options.map((option) => {
        const isSelected = selected.has(option.value);
        const id = `${name}-${option.value}`;

        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-base",
              "transition-[border-color,background-color,transform] duration-150",
              "hover:border-foreground/30 active:scale-[0.99]",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              "motion-reduce:transition-none motion-reduce:active:scale-100",
              isSelected
                ? "border-accent bg-accent-subtle text-foreground dark:bg-accent/15"
                : "border-input bg-card text-foreground",
              invalid && !isSelected && "border-destructive/60",
            )}
          >
            <input
              id={id}
              name={name}
              type={multiple ? "checkbox" : "radio"}
              checked={isSelected}
              onChange={() => toggle(option.value)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "flex size-5 shrink-0 items-center justify-center border-2 transition-colors",
                multiple ? "rounded-[0.25rem]" : "rounded-full",
                isSelected ? "border-accent bg-accent text-accent-foreground" : "border-input",
              )}
            >
              {isSelected ? <Check className="size-3.5" strokeWidth={3} /> : null}
            </span>
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

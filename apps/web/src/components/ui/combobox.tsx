"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Small line under the label, for example how many models a make has. */
  hint?: string;
};

type ComboboxProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly ComboboxOption[];
  placeholder?: string;
  /** Lets someone enter a value that is not on the list, which imports need. */
  allowCustom?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string | undefined;
  emptyMessage?: string;
  renderPrefix?: (option: ComboboxOption) => React.ReactNode;
};

/**
 * A searchable picker built on a real text input and a listbox, following the
 * ARIA combobox pattern, so it is fully keyboard operable and reads correctly
 * to a screen reader. No dependency: a picker is not worth 40kB on 3G.
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  allowCustom = false,
  disabled = false,
  invalid = false,
  describedBy,
  emptyMessage = "Nothing matches that.",
  renderPrefix,
}: ComboboxProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? options.filter((option) => option.label.toLowerCase().includes(needle))
      : [...options];

    // Offer the typed value when it is not already on the list.
    if (
      allowCustom &&
      needle.length > 0 &&
      !options.some((option) => option.label.toLowerCase() === needle)
    ) {
      matches.push({ value: query.trim(), label: query.trim(), hint: "Use what you typed" });
    }

    return matches;
  }, [options, query, allowCustom]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  // Keep the highlighted row in view when moving with the keyboard.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const active = listRef.current?.children[activeIndex];
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  function commit(option: ComboboxOption): void {
    onChange(option.value);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        const next = current + step;
        if (next < 0) {
          return filtered.length - 1;
        }
        if (next >= filtered.length) {
          return 0;
        }
        return next;
      });
      return;
    }

    if (event.key === "Home" && isOpen) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End" && isOpen) {
      event.preventDefault();
      setActiveIndex(Math.max(0, filtered.length - 1));
      return;
    }

    if (event.key === "Enter") {
      if (!isOpen) {
        return;
      }
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) {
        commit(option);
      }
      return;
    }

    if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setQuery("");
      }
      return;
    }

    if (event.key === "Tab" && isOpen) {
      setIsOpen(false);
      setQuery("");
    }
  }

  const activeOptionId = isOpen && filtered.length > 0 ? `${listId}-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          disabled={disabled}
          placeholder={placeholder}
          value={isOpen ? query : value}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Committing a typed value on blur means nobody loses what they
            // wrote by tapping elsewhere.
            if (allowCustom && isOpen && query.trim().length > 0) {
              onChange(query.trim());
            }
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "min-h-12 w-full rounded-lg border border-input bg-card px-3.5 pr-10 text-base text-foreground",
            "placeholder:text-muted-foreground/70",
            "transition-colors duration-150 motion-reduce:transition-none",
            "hover:border-foreground/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
            "aria-[invalid=true]:border-destructive",
            renderPrefix && value ? "pl-12" : "",
          )}
        />

        {renderPrefix && value && !isOpen ? (
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2">
            {renderPrefix({ value, label: value })}
          </span>
        ) : null}

        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground">
          {isOpen ? <Search aria-hidden size={18} /> : <ChevronDown aria-hidden size={18} />}
        </span>
      </div>

      {isOpen ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          /*
            overscroll-contain stops the page scrolling underneath once the
            list reaches its end, which on a phone reads as the whole screen
            lurching mid-gesture.
          */
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto overscroll-contain rounded-lg border border-border bg-popover py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3.5 py-3 text-base text-muted-foreground">{emptyMessage}</li>
          ) : (
            filtered.map((option, index) => {
              const isActive = index === activeIndex;
              const isSelected = option.value === value;

              return (
                <li
                  key={`${option.value}-${index}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  /*
                    Selection happens on click, never on pointer down.

                    Committing on pointer down made the list impossible to
                    scroll on a phone: the first thing a scroll gesture does is
                    put a finger on an option, and that was enough to choose it.
                    A click only fires when the finger goes down and comes up on
                    the same option without panning, which is exactly the
                    difference between choosing and scrolling.

                    The mouse down handler keeps what the old code was really
                    after, which is stopping the input blurring and throwing the
                    selection away. It is deliberately mouse down rather than
                    pointer down: no mouse event fires while a touch is being
                    dragged, so it cannot interfere with scrolling.
                  */
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commit(option)}
                  onPointerEnter={(event) => {
                    // Only a real pointer highlights on hover. Under a finger
                    // this would drag the highlight down the list while
                    // scrolling.
                    if (event.pointerType === "mouse") {
                      setActiveIndex(index);
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-2.5 py-2.5 text-base",
                    isActive ? "bg-muted" : "",
                  )}
                >
                  {renderPrefix ? renderPrefix(option) : null}

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-popover-foreground">{option.label}</span>
                    {option.hint ? (
                      <span className="block truncate text-sm text-muted-foreground">
                        {option.hint}
                      </span>
                    ) : null}
                  </span>

                  {isSelected ? (
                    <Check aria-hidden size={18} className="shrink-0 text-accent" />
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

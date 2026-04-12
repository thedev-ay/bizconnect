"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  searchText?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (option: ComboboxOption) => void;
  selectedValue?: string;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  helperText?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  renderOption?: (option: ComboboxOption, state: { active: boolean; selected: boolean }) => React.ReactNode;
  footer?: React.ReactNode;
}

export function Combobox({
  options,
  value,
  onValueChange,
  onSelect,
  selectedValue,
  placeholder,
  disabled,
  emptyMessage = "No matches found.",
  helperText,
  className,
  inputClassName,
  renderOption,
  footer,
}: ComboboxProps) {
  const listId = React.useId();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const query = value.trim().toLowerCase();
  const filteredOptions = query
    ? options.filter((option) => {
        const haystack = `${option.label} ${option.description ?? ""} ${option.searchText ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
    : options;

  React.useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions.length, open]);

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => {
        if (filteredOptions.length === 0) return -1;
        return index < filteredOptions.length - 1 ? index + 1 : 0;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => {
        if (filteredOptions.length === 0) return -1;
        return index > 0 ? index - 1 : filteredOptions.length - 1;
      });
      return;
    }

    if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) {
        onSelect(option);
        setOpen(false);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={cn("space-y-2", className)}>
      <div className="relative">
        <Input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pr-9", inputClassName)}
        />
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {open && (
        <div className="rounded-2xl border border-border/70 bg-background/98 p-2 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)]">
          <div id={listId} role="listbox" className="max-h-52 space-y-1 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const selected = selectedValue === option.value;
                const active = index === activeIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      active ? "bg-accent" : "hover:bg-accent/70"
                    )}
                  >
                    {renderOption ? (
                      renderOption(option, { active, selected })
                    ) : (
                      <>
                        <span className="font-medium text-foreground">{option.label}</span>
                        {option.description ? (
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        ) : null}
                      </>
                    )}
                    {selected ? <Check className="ml-2 h-4 w-4 shrink-0 text-primary" /> : null}
                  </button>
                );
              })
            ) : (
              <p className="px-2 py-3 text-sm text-muted-foreground">{emptyMessage}</p>
            )}
          </div>
          {footer ? <div className="mt-2 border-t border-border/60 pt-2">{footer}</div> : null}
        </div>
      )}

      {helperText ? <div className="text-xs text-muted-foreground">{helperText}</div> : null}
    </div>
  );
}

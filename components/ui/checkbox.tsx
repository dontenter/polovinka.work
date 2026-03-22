"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, checked, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate ?? false;
      }
    }, [indeterminate]);

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={inputRef}
          checked={checked}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            "h-5 w-5 rounded border-2 border-border bg-card",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            "peer-checked:border-accent peer-checked:bg-accent",
            "peer-indeterminate:border-accent peer-indeterminate:bg-accent",
            "transition-colors",
            className
          )}
        >
          {checked && !indeterminate && (
            <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
          )}
          {indeterminate && (
            <Minus className="h-3.5 w-3.5 text-white stroke-[3]" />
          )}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };

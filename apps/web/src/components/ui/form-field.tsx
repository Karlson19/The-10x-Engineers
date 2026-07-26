import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
  className?: string;
};

/**
 * Ties the label, the hint and the error message to the input with real ids, so
 * the message is read out with the field rather than floating on its own.
 */
export function FormField({ id, label, error, hint, children, className }: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": describedBy.length > 0 ? describedBy : undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <p id={errorId} aria-live="polite" className="text-sm text-destructive empty:hidden">
        {error ?? ""}
      </p>
    </div>
  );
}

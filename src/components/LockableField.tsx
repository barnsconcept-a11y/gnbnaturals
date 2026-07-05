import { useEffect, useState, type ReactNode } from "react";
import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  className?: string;
  /** Bump this number to force the field back into the locked state. */
  lockSignal?: number;
  children: (locked: boolean) => ReactNode;
};

/**
 * Wraps a field so it renders disabled by default with a pencil icon
 * beside it. Clicking the pencil unlocks it for editing to prevent
 * accidental changes. Increment `lockSignal` (e.g. after a successful
 * save) to re-lock the field programmatically.
 */
export function LockableField({ className, lockSignal, children }: Props) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (lockSignal !== undefined) setUnlocked(false);
  }, [lockSignal]);

  return (
    <div className={`flex items-start gap-2 ${className ?? ""}`}>
      <div className="flex-1 min-w-0">{children(!unlocked)}</div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={unlocked ? "Lock field" : "Edit field"}
        className="mt-6 h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setUnlocked((v) => !v)}
      >
        {unlocked ? (
          <Check className="h-4 w-4" />
        ) : (
          <Pencil className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

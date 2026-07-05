import { useState, type ReactNode } from "react";
import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  locked?: boolean;
  onToggle?: (unlocked: boolean) => void;
  className?: string;
  children: (locked: boolean) => ReactNode;
};

/**
 * Wraps a field so it renders disabled by default with a pencil icon
 * beside it. Clicking the pencil unlocks it for editing to prevent
 * accidental changes.
 */
export function LockableField({ className, children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
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

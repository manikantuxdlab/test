import { Trash2, X } from "lucide-react";

interface ConfirmDeleteDialogProps {
  personName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({ personName, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4 sm:items-center"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" />
          </div>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 mb-6">
          <h3 className="text-lg font-bold text-white leading-tight">Remove Person</h3>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently remove{" "}
            <span className="font-bold text-white">{personName}</span> from the directory? This
            action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-lg border border-border text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-surface transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 rounded-lg bg-destructive text-sm font-bold uppercase tracking-wider text-white hover:bg-destructive/90 transition shadow-glow-destructive"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

type LogRetentionCallFormProps = {
  outcome: string;
  setOutcome: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function LogRetentionCallForm({
  outcome,
  setOutcome,
  notes,
  setNotes,
  submitting,
  onSubmit,
}: LogRetentionCallFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900"
    >
      <h3 className="mb-3 text-sm font-medium text-zinc-900">Log new call</h3>
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-600">Outcome</label>
          <input
            type="text"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="e.g. Reached, No answer"
            className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-zinc-600">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Call notes..."
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Log call"}
          </button>
        </div>
      </div>
    </form>
  );
}

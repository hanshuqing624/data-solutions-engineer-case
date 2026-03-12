type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-40 hover:bg-zinc-100"
      >
        Previous
      </button>
      <span className="text-sm text-zinc-600">
        {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-40 hover:bg-zinc-100"
      >
        Next
      </button>
    </div>
  );
}

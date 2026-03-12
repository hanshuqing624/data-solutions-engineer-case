import { Pagination } from "@/components/Pagination";

type Column<T> = {
  key: string;
  header: string;
  alignRight?: boolean;
  render: (item: T) => React.ReactNode;
};

type PaginatedTableProps<T> = {
  title: string;
  columns: Column<T>[];
  data: T[];
  getKey: (item: T, index: number, page: number, pageSize: number) => string;
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  emptyMessage?: string;
};

export function PaginatedTable<T>({
  title,
  columns,
  data,
  getKey,
  page,
  onPageChange,
  pageSize,
  emptyMessage = "No data",
}: PaginatedTableProps<T>) {
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className={title ? "mb-8" : ""}>
      {title && (
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">{title}</h2>
      )}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white text-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-900">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium ${col.alignRight ? "text-right" : ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-zinc-600"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, i) => (
                <tr
                  key={getKey(item, i, page, pageSize)}
                  className="border-b border-zinc-100 last:border-0 text-zinc-900"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 ${col.alignRight ? "text-right" : ""}`}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </section>
  );
}

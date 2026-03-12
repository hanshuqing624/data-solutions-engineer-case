type CustomerFiltersProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  countryFilter: string;
  onCountryChange: (value: string) => void;
  segmentFilter: string;
  onSegmentChange: (value: string) => void;
  countries: string[];
  segments: string[];
};

export function CustomerFilters({
  searchQuery,
  onSearchChange,
  countryFilter,
  onCountryChange,
  segmentFilter,
  onSegmentChange,
  countries,
  segments,
}: CustomerFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
      <input
        type="text"
        placeholder="Search by company name..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64 rounded border border-zinc-300 px-3 py-2 text-sm"
      />
      <select
        value={countryFilter}
        onChange={(e) => onCountryChange(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 text-sm"
      >
        <option value="">All countries</option>
        {countries.map((co) => (
          <option key={co} value={co}>
            {co}
          </option>
        ))}
      </select>
      <select
        value={segmentFilter}
        onChange={(e) => onSegmentChange(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 text-sm"
      >
        <option value="">All segments</option>
        {segments.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

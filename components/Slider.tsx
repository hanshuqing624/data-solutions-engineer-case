type SliderProps = {
  label: string;
  tooltip?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
};

export function Slider({
  label,
  tooltip,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
}: SliderProps) {
  const displayValue =
    step < 1 ? `${Math.round(value * 100)}%` : `${value}${suffix}`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 text-zinc-600" title={tooltip}>
          {label}
          {tooltip && (
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-500 hover:bg-zinc-300 hover:text-zinc-700"
              title={tooltip}
              aria-label={`Info: ${tooltip}`}
            >
              ?
            </span>
          )}
        </span>
        <span className="font-medium text-zinc-900">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-zinc-700"
      />
    </div>
  );
}

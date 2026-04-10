interface SliderTrackProps {
  min: number;
  max: number;
  step: number;
  value: number;
  percent: number;
  onChange: (value: number) => void;
  trackHeight?: string;
  ariaLabel?: string;
}

export default function SliderTrack({
  min,
  max,
  step,
  value,
  percent,
  onChange,
  trackHeight = 'h-10',
  ariaLabel,
}: SliderTrackProps) {
  return (
    <div className={`relative ${trackHeight} w-full`}>
      <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-[var(--orange)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="absolute top-0 h-full w-full cursor-pointer opacity-0"
      />
      <div
        className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--orange)] bg-white"
        style={{ left: `${percent}%` }}
      />
    </div>
  );
}

import type { ScheduleBar } from '../services/planning.service';

function parseDay(d: string): number {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).getTime();
}

export function PlanningScheduleGantt({ bars }: { bars: ScheduleBar[] }) {
  if (bars.length === 0) return null;

  const times = bars.flatMap((b) => [parseDay(b.start), parseDay(b.end)]);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const span = Math.max(1, maxT - minT + 86400000);

  const palette = [
    'bg-primary-500/90',
    'bg-emerald-600/85',
    'bg-amber-600/85',
    'bg-violet-600/85',
    'bg-rose-600/85',
  ];

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 text-sm font-medium text-neutral-800">
        Gantt (dias corridos — barras proporcionais ao intervalo)
      </div>
      <div className="p-3 space-y-2 max-h-[min(420px,60vh)] overflow-y-auto">
        {bars.map((bar, i) => {
          const s = parseDay(bar.start);
          const e = parseDay(bar.end);
          const left = ((s - minT) / span) * 100;
          const rawW = ((e - s) / span) * 100;
          const width = Math.max(2, rawW + 0.5);
          const color = palette[i % palette.length];
          return (
            <div key={bar.id} className="flex items-center gap-2 text-xs">
              <div className="w-28 sm:w-40 shrink-0 truncate text-neutral-700 font-medium" title={bar.title}>
                {bar.title}
              </div>
              <div className="flex-1 min-w-0 h-7 bg-neutral-100 rounded relative">
                <div
                  className={`absolute top-1 bottom-1 rounded ${color} shadow-sm`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${bar.start} → ${bar.end} · ${bar.hours.toFixed(1)}h`}
                />
              </div>
              <div className="w-24 shrink-0 text-neutral-500 tabular-nums text-right">
                {bar.start} → {bar.end}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

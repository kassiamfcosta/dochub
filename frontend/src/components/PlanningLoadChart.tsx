import type { WeekLoadRow } from '../services/planning.service';

function formatWeekLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function PlanningWeeklyLoadChart({ rows }: { rows: WeekLoadRow[] }) {
  if (rows.length === 0) return null;
  const maxH = Math.max(...rows.map((r) => Math.max(r.hoursScheduled, r.capacityHours)), 1);

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 text-sm font-medium text-neutral-800">
        Carga por semana (esforço vs capacidade do time)
      </div>
      <div className="p-3 space-y-3">
        {rows.map((r) => {
          const pct = Math.min(100, (r.hoursScheduled / maxH) * 100);
          const capPct = Math.min(100, (r.capacityHours / maxH) * 100);
          const over = r.hoursScheduled > r.capacityHours;
          return (
            <div key={r.weekStart}>
              <div className="flex justify-between text-xs text-neutral-600 mb-1">
                <span>Sem. {formatWeekLabel(r.weekStart)}</span>
                <span className={over ? 'text-amber-700 font-medium' : ''}>
                  {r.hoursScheduled.toFixed(1)}h / {r.capacityHours.toFixed(1)}h
                </span>
              </div>
              <div className="h-3 rounded bg-neutral-100 relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-neutral-300/80 rounded"
                  style={{ width: `${capPct}%` }}
                  title="Capacidade"
                />
                <div
                  className={`absolute top-0 bottom-0 left-0 rounded ${over ? 'bg-amber-500' : 'bg-primary-500'}`}
                  style={{ width: `${pct}%` }}
                  title="Horas alocadas"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

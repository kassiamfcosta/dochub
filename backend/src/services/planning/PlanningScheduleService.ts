/**
 * Cronograma em dias úteis (seg–sex): pontos × fator, margem, capacidade do time (N devs × h/dia),
 * dependências (caminho crítico) e alocação paralela por dia.
 */

export interface PlanningItemForSchedule {
  id: number;
  title: string;
  description?: string | null;
  storyPoints: number;
  pokerSpecial?: string | null;
  estimatedHours?: number | null;
  sortOrder: number;
  /** IDs das HUs predecessoras (todas precisam estar prontas antes). */
  dependsOnItemIds?: number[];
}

export interface PointConfig {
  hoursPerPoint: number;
  /** Capacidade total do time por dia útil (h) — N × h/dev. */
  hoursPerDay: number;
  developerCount: number;
  hoursPerDevPerDay: number;
  marginPercent: number;
  marginPointsThreshold: number;
}

export interface SprintPlan {
  sprintCount: number;
  workingDaysPerSprint: number;
}

export interface ScheduleBar {
  id: number;
  title: string;
  start: string;
  end: string;
  hours: number;
  workingDays: number;
  marginApplied: boolean;
}

export interface WeekLoadRow {
  weekStart: string;
  hoursScheduled: number;
  capacityHours: number;
}

export interface ScheduleTimeline {
  bars: ScheduleBar[];
  weeklyLoad: WeekLoadRow[];
  teamHoursPerDay: number;
  developerCount: number;
  warnings: string[];
  criticalPathTitles: string[];
}

export function formatPokerLabel(storyPoints: number, pokerSpecial?: string | null): string {
  if (pokerSpecial === 'unknown') return '?';
  if (pokerSpecial === 'infinity') return '∞';
  if (pokerSpecial === 'coffee') return '☕';
  const n = Number(storyPoints);
  if (n === 0.5) return '½';
  return String(n);
}

export function teamHoursPerDay(config: PointConfig): number {
  const n = Math.max(1, Math.floor(config.developerCount || 1));
  const h = Math.max(0.25, Number(config.hoursPerDevPerDay) || 8);
  return n * h;
}

/**
 * Horas efetivas: manual > pontos×fator (+ margem se pontos altos).
 */
export function resolveScheduleHours(
  item: PlanningItemForSchedule,
  hoursPerPoint: number,
  marginPercent: number,
  marginPointsThreshold: number
): { hours: number; source: 'manual' | 'points' | 'none'; marginApplied: boolean } {
  if (item.estimatedHours != null && !Number.isNaN(Number(item.estimatedHours))) {
    return { hours: Math.max(0, Number(item.estimatedHours)), source: 'manual', marginApplied: false };
  }
  if (item.pokerSpecial === 'coffee' || item.pokerSpecial === 'unknown' || item.pokerSpecial === 'infinity') {
    return { hours: 0, source: 'none', marginApplied: false };
  }
  const pts = Number(item.storyPoints);
  let hours = Math.max(0, pts * hoursPerPoint);
  let marginApplied = false;
  if (marginPercent > 0 && pts >= marginPointsThreshold) {
    hours *= 1 + marginPercent / 100;
    marginApplied = true;
  }
  return { hours, source: 'points', marginApplied };
}

function addWorkingDays(date: Date, workingDays: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < workingDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mondayOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}

function weekKey(d: Date): string {
  return toISODateLocal(mondayOfWeek(d));
}

function workingDaysBetweenInclusive(start: Date, end: Date): number {
  if (end < start) return 0;
  let n = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

function nextWorkingDayStart(d: Date): Date {
  const x = new Date(d);
  while (x.getDay() === 0 || x.getDay() === 6) {
    x.setDate(x.getDate() + 1);
  }
  return x;
}

/** Soma de horas da raiz até o item (inclusive), para caminho crítico em cadeia simples. */
function criticalPathDag(
  items: PlanningItemForSchedule[],
  effHours: Map<number, number>
): { titles: string[]; hasCycle: boolean } {
  if (items.length === 0) return { titles: [], hasCycle: false };
  const byId = new Map(items.map((i) => [i.id, i]));

  // edges: dep -> item (porque item só pode começar quando deps terminam)
  const out = new Map<number, number[]>();
  const indeg = new Map<number, number>();
  for (const it of items) {
    indeg.set(it.id, 0);
    out.set(it.id, []);
  }
  for (const it of items) {
    const deps = (it.dependsOnItemIds ?? []).filter((d) => byId.has(d) && d !== it.id);
    for (const dep of deps) {
      out.get(dep)!.push(it.id);
      indeg.set(it.id, (indeg.get(it.id) ?? 0) + 1);
    }
  }

  // Kahn topo
  const q: number[] = [];
  for (const [id, d] of indeg) if (d === 0) q.push(id);
  q.sort((a, b) => (byId.get(a)!.sortOrder ?? 0) - (byId.get(b)!.sortOrder ?? 0));

  const dist = new Map<number, number>(); // melhor soma até o nó (inclui ele)
  const prev = new Map<number, number | null>();
  for (const it of items) {
    dist.set(it.id, effHours.get(it.id) ?? 0);
    prev.set(it.id, null);
  }

  let processed = 0;
  while (q.length) {
    const u = q.shift()!;
    processed++;
    const base = dist.get(u) ?? 0;
    for (const v of out.get(u) ?? []) {
      const cand = base + (effHours.get(v) ?? 0);
      if (cand >= (dist.get(v) ?? 0)) {
        dist.set(v, cand);
        prev.set(v, u);
      }
      indeg.set(v, (indeg.get(v) ?? 0) - 1);
      if ((indeg.get(v) ?? 0) === 0) q.push(v);
    }
  }

  const hasCycle = processed !== items.length;

  let bestEnd = items[0].id;
  let best = dist.get(bestEnd) ?? 0;
  for (const it of items) {
    const d = dist.get(it.id) ?? 0;
    if (d >= best) {
      best = d;
      bestEnd = it.id;
    }
  }

  const titles: string[] = [];
  let cur: number | null = bestEnd;
  const guard = new Set<number>();
  while (cur != null && !guard.has(cur)) {
    guard.add(cur);
    const it = byId.get(cur);
    if (!it) break;
    titles.unshift(it.title);
    cur = prev.get(cur) ?? null;
  }

  return { titles, hasCycle };
}

export interface SimulationResult {
  bars: ScheduleBar[];
  weeklyLoad: WeekLoadRow[];
  warnings: string[];
  criticalPathTitles: string[];
  totalWorkingDaysProject: number;
  /** Dias úteis acumulados antes de cada HU (para sprint). */
  cumWorkDaysBefore: number[];
}

export function simulateSchedule(
  items: PlanningItemForSchedule[],
  config: PointConfig,
  startDate: Date
): SimulationResult {
  const warnings: string[] = [];
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const byId = new Map(sorted.map((i) => [i.id, i]));

  for (const it of sorted) {
    for (const depId of it.dependsOnItemIds ?? []) {
      if (!byId.has(depId)) {
        warnings.push(`“${it.title}”: dependência (ID ${depId}) não encontrada — ignorada no grafo.`);
      }
    }
  }

  const effHours = new Map<number, number>();
  const marginMap = new Map<number, boolean>();
  for (const it of sorted) {
    const { hours, marginApplied } = resolveScheduleHours(
      it,
      config.hoursPerPoint,
      config.marginPercent,
      config.marginPointsThreshold
    );
    effHours.set(it.id, hours);
    marginMap.set(it.id, marginApplied);
  }

  const cp = criticalPathDag(sorted, effHours);
  const criticalPathTitles = cp.titles;
  if (cp.hasCycle) {
    warnings.push('Ciclo detectado no grafo de dependências; caminho crítico e simulação podem estar incorretos.');
  }

  const rem = new Map<number, number>();
  sorted.forEach((it) => rem.set(it.id, effHours.get(it.id) ?? 0));

  const completed = new Set<number>();
  const startMap = new Map<number, Date>();
  const endMap = new Map<number, Date>();
  const lastWorkDay = new Map<number, Date>();

  const teamCap = Math.max(0.5, teamHoursPerDay(config));
  // developerCount ainda influencia a capacidade total do time (teamCap),
  // mas não fazemos alocação por desenvolvedor (round-robin).

  const weekHours = new Map<string, number>();

  let currentDay = nextWorkingDayStart(new Date(startDate));
  let dayGuard = 0;
  const maxDays = 100000;

  while (completed.size < sorted.length && dayGuard < maxDays) {
    dayGuard++;

    let flushed: boolean;
    do {
      flushed = false;
      for (const it of sorted) {
        if (completed.has(it.id)) continue;
        if ((rem.get(it.id) ?? 0) > 1e-9) continue;
        const deps = it.dependsOnItemIds ?? [];
        if (deps.some((d) => byId.has(d) && !completed.has(d))) continue;
        completed.add(it.id);
        const d0 = new Date(currentDay);
        startMap.set(it.id, d0);
        endMap.set(it.id, d0);
        lastWorkDay.set(it.id, d0);
        flushed = true;
      }
    } while (flushed);

    if (completed.size === sorted.length) break;

    const ready = sorted.filter((it) => {
      if (completed.has(it.id)) return false;
      if ((rem.get(it.id) ?? 0) <= 1e-9) return false;
      const deps = it.dependsOnItemIds ?? [];
      return deps.every((d) => !byId.has(d) || completed.has(d));
    });

    if (ready.length === 0) {
      const stuck = sorted.filter((it) => !completed.has(it.id) && (rem.get(it.id) ?? 0) > 1e-9);
      if (stuck.length > 0) {
        warnings.push(
          'Itens com horas restantes mas sem dependências satisfeitas (ciclo ou dependência inválida); interrompendo simulação.'
        );
      }
      break;
    }

    ready.sort((a, b) => a.sortOrder - b.sortOrder);

    const share = teamCap / ready.length;
    const allocations: { id: number; take: number }[] = [];

    for (const it of ready) {
      const r = rem.get(it.id) ?? 0;
      const take = Math.min(r, share);
      if (take <= 1e-9) continue;
      allocations.push({ id: it.id, take });
      rem.set(it.id, r - take);

      if (!startMap.has(it.id)) {
        startMap.set(it.id, new Date(currentDay));
      }
      lastWorkDay.set(it.id, new Date(currentDay));

      if ((rem.get(it.id) ?? 0) <= 1e-9) {
        completed.add(it.id);
        endMap.set(it.id, new Date(currentDay));
      }
    }

    const wk = weekKey(currentDay);
    let allocSum = 0;
    for (const { take } of allocations) {
      allocSum += take;
    }
    weekHours.set(wk, (weekHours.get(wk) ?? 0) + allocSum);

    currentDay = addWorkingDays(new Date(currentDay), 1);
    currentDay = nextWorkingDayStart(currentDay);
  }

  const bars: ScheduleBar[] = [];
  const cumWorkDaysBefore: number[] = [];
  let cum = 0;

  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i];
    const s = startMap.get(it.id);
    const e = endMap.get(it.id) ?? lastWorkDay.get(it.id);
    const h = effHours.get(it.id) ?? 0;
    let wd = 0;
    if (s && e) {
      wd = workingDaysBetweenInclusive(s, e);
    }
    cumWorkDaysBefore.push(cum);
    cum += wd;

    bars.push({
      id: it.id,
      title: it.title,
      start: s ? toISODateLocal(s) : toISODateLocal(nextWorkingDayStart(new Date(startDate))),
      end: e ? toISODateLocal(e) : toISODateLocal(nextWorkingDayStart(new Date(startDate))),
      hours: h,
      workingDays: wd,
      marginApplied: marginMap.get(it.id) ?? false,
    });
  }

  const weekKeys = [...weekHours.keys()].sort();
  const weeklyLoad: WeekLoadRow[] = weekKeys.map((wk) => {
    const cap = 5 * teamCap;
    return {
      weekStart: wk,
      hoursScheduled: Math.round((weekHours.get(wk) ?? 0) * 10) / 10,
      capacityHours: Math.round(cap * 10) / 10,
    };
  });

  let totalWd = 0;
  if (bars.length > 0) {
    const first = bars[0].start;
    const last = bars[bars.length - 1].end;
    const d0 = new Date(first + 'T12:00:00');
    const d1 = new Date(last + 'T12:00:00');
    totalWd = workingDaysBetweenInclusive(d0, d1);
  }

  return {
    bars,
    weeklyLoad,
    warnings,
    criticalPathTitles,
    totalWorkingDaysProject: totalWd,
    cumWorkDaysBefore,
  };
}

export function buildScheduleMarkdown(
  items: PlanningItemForSchedule[],
  config: PointConfig,
  startDate: Date,
  sprintPlan?: SprintPlan
): string {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const byId = new Map(sorted.map((i) => [i.id, i] as const));
  const sim = simulateSchedule(items, config, startDate);
  const pokerWarnings: string[] = [];

  const useSprints =
    sprintPlan != null &&
    sprintPlan.sprintCount > 0 &&
    sprintPlan.workingDaysPerSprint > 0;

  const teamCap = teamHoursPerDay(config);
  const capHours =
    useSprints && sprintPlan ? sprintPlan.sprintCount * sprintPlan.workingDaysPerSprint * teamCap : null;

  const lines: string[] = [
    '# Cronograma (dias úteis — seg a sex)',
    '',
    `**Data de início:** ${formatDate(nextWorkingDayStart(new Date(startDate)))}`,
    `**Capacidade do time:** ${config.developerCount} dev(s) × ${config.hoursPerDevPerDay}h/dia = **${teamCap.toFixed(2)}h/dia útil**`,
    `**Conversão:** ${config.hoursPerPoint}h por ponto | **Margem:** +${config.marginPercent}% em HUs com ≥ ${config.marginPointsThreshold} pts (estimativa por pontos)`,
    '',
    '### Caminho crítico (soma de horas na cadeia de dependências)',
    sim.criticalPathTitles.length > 0
      ? `- ${sim.criticalPathTitles.join(' → ')}`
      : '- (sem dependências ou uma HU)',
    '',
  ];

  if (useSprints && sprintPlan && capHours != null) {
    lines.push(
      `**Sprints:** ${sprintPlan.sprintCount} sprint(s) × ${sprintPlan.workingDaysPerSprint} dia(s) útil(is) cada (~${capHours.toFixed(1)}h de capacidade no período)`,
      ''
    );
  }

  if (useSprints) {
    lines.push(
      '| # | HU | Dependente de | Poker | Horas | Dias | Sprint | Início | Término |',
      '|---|----|---------------|-------|-------|------|--------|--------|---------|'
    );
  } else {
    lines.push(
      '| # | HU | Dependente de | Poker | Horas | Dias | Início | Término |',
      '|---|----|---------------|-------|-------|------|--------|---------|'
    );
  }

  let totalPointsNumeric = 0;
  let totalHours = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const bar = sim.bars[i];
    const label = formatPokerLabel(item.storyPoints, item.pokerSpecial);
    const { hours } = resolveScheduleHours(
      item,
      config.hoursPerPoint,
      config.marginPercent,
      config.marginPointsThreshold
    );

    if (item.pokerSpecial === 'unknown' || item.pokerSpecial === 'infinity') {
      if (item.estimatedHours == null) {
        pokerWarnings.push(
          `“${item.title}”: poker ${label} — defina **horas** na etapa de cronograma para incluir no tempo.`
        );
      }
    }

    if (!item.pokerSpecial) {
      totalPointsNumeric += Number(item.storyPoints);
    }

    totalHours += hours;

    const depsTitles = (item.dependsOnItemIds ?? [])
      .filter((id) => id !== item.id)
      .map((id) => byId.get(id)?.title)
      .filter((t): t is string => Boolean(t && String(t).trim()))
      .map((t) => String(t).trim());
    const depsStr = depsTitles.length ? depsTitles.join(', ') : '—';
    const hoursStr = hours.toFixed(1);
    const wdStr = String(bar?.workingDays ?? 0);
    const startStr = bar ? formatDate(new Date(bar.start + 'T12:00:00')) : '—';
    const endStr = bar ? formatDate(new Date(bar.end + 'T12:00:00')) : '—';
    const safeTitle = item.title.replace(/\|/g, '\\|');
    const safeDeps = depsStr.replace(/\|/g, '\\|');

    if (useSprints && sprintPlan) {
      const cum = sim.cumWorkDaysBefore[i] ?? 0;
      const sprintNum = Math.floor(cum / sprintPlan.workingDaysPerSprint) + 1;
      const sprintCell =
        sprintNum > sprintPlan.sprintCount
          ? `${sprintNum} (acima do limite)`
          : String(sprintNum);
      if (sprintNum > sprintPlan.sprintCount) {
        pokerWarnings.push(
          `“${item.title}”: início previsto na sprint ${sprintNum}, acima das ${sprintPlan.sprintCount} sprint(s) informadas.`
        );
      }
      lines.push(
        `| ${i + 1} | ${safeTitle} | ${safeDeps} | ${label} | ${hoursStr} | ${wdStr} | ${sprintCell} | ${startStr} | ${endStr} |`
      );
    } else {
      lines.push(
        `| ${i + 1} | ${safeTitle} | ${safeDeps} | ${label} | ${hoursStr} | ${wdStr} | ${startStr} | ${endStr} |`
      );
    }
  }

  lines.push('');
  lines.push('---');
  lines.push(
    `**Totais:** ${sorted.length} HUs | ${totalPointsNumeric.toFixed(2)} pts (numéricos) | ${totalHours.toFixed(1)}h`
  );
  if (useSprints && sprintPlan && capHours != null) {
    const capDays = sprintPlan.sprintCount * sprintPlan.workingDaysPerSprint;
    const deltaH = totalHours - capHours;
    lines.push(
      `**Capacidade das sprints:** ${capDays} dia(s) útil(is) (${capHours.toFixed(1)}h) | **Saldo (trabalho − capacidade):** ${deltaH >= 0 ? '+' : ''}${deltaH.toFixed(1)}h`
    );
  }

  const lastBar = sim.bars[sim.bars.length - 1];
  if (lastBar) {
    lines.push(`**Previsão de término (última HU):** ${formatDate(new Date(lastBar.end + 'T12:00:00'))}`);
  }

  const allWarnings = [...sim.warnings, ...pokerWarnings];
  if (allWarnings.length > 0) {
    lines.push('');
    lines.push('### Atenção');
    allWarnings.forEach((w) => lines.push(`- ${w}`));
  }

  return lines.join('\n');
}

export function buildScheduleTimeline(
  items: PlanningItemForSchedule[],
  config: PointConfig,
  startDate: Date
): ScheduleTimeline {
  const sim = simulateSchedule(items, config, startDate);
  return {
    bars: sim.bars,
    weeklyLoad: sim.weeklyLoad,
    teamHoursPerDay: teamHoursPerDay(config),
    developerCount: Math.max(1, Math.floor(config.developerCount || 1)),
    warnings: sim.warnings,
    criticalPathTitles: sim.criticalPathTitles,
  };
}

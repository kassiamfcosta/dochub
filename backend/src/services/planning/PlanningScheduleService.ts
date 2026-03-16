/**
 * Serviço para gerar cronograma em Markdown a partir de HUs, pontos e configuração de tempo.
 * Converte story points em dias úteis (horas por ponto / horas por dia).
 */

export interface PlanningItemForSchedule {
  id: number;
  title: string;
  description?: string | null;
  storyPoints: number;
  sortOrder: number;
}

export interface PointConfig {
  hoursPerPoint: number;
  hoursPerDay: number;
}

/**
 * Adiciona N dias úteis a uma data (ignora fins de semana).
 */
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

/**
 * Formata data para exibição (dd/MM/yyyy).
 */
function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Gera o cronograma em Markdown: para cada HU, calcula horas (pontos * horasPorPonto),
 * converte em dias úteis, acumula a partir da data de início e lista em markdown.
 */
export function buildScheduleMarkdown(
  items: PlanningItemForSchedule[],
  config: PointConfig,
  startDate: Date
): string {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const lines: string[] = [
    '# Cronograma (dias úteis)',
    '',
    `**Data de início:** ${formatDate(startDate)}`,
    `**Configuração:** ${config.hoursPerPoint}h por ponto, ${config.hoursPerDay}h por dia útil`,
    '',
    '| # | Funcionalidade / HU | Pontos | Horas est. | Dias úteis | Início | Término |',
    '|---|---------------------|--------|------------|------------|--------|---------|',
  ];

  let currentStart = new Date(startDate);
  let totalPoints = 0;
  let totalHours = 0;
  let totalDays = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const hours = item.storyPoints * config.hoursPerPoint;
    const workingDays = Math.max(1, Math.ceil(hours / config.hoursPerDay));
    const endDate = addWorkingDays(currentStart, workingDays);

    totalPoints += item.storyPoints;
    totalHours += hours;
    totalDays += workingDays;

    lines.push(
      `| ${i + 1} | ${item.title.replace(/\|/g, '\\|')} | ${item.storyPoints} | ${hours.toFixed(1)} | ${workingDays} | ${formatDate(currentStart)} | ${formatDate(endDate)} |`
    );
    currentStart = addWorkingDays(endDate, 1);
  }

  lines.push('');
  lines.push('---');
  lines.push(`**Total:** ${sorted.length} itens | ${totalPoints} pontos | ${totalHours.toFixed(1)}h | ${totalDays} dias úteis`);
  const endTotal = addWorkingDays(new Date(startDate), totalDays);
  lines.push(`**Previsão de conclusão:** ${formatDate(endTotal)}`);
  return lines.join('\n');
}

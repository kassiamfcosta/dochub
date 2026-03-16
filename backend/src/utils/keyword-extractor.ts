const STOP_WORDS = new Set([
  'de','da','do','das','dos','e','a','o','os','as','um','uma','para','por','com','sem',
  'em','no','na','nos','nas','que','se','não','sim','mais','menos','muito','pouco','já',
  'entre','sobre','até','como','quando','onde','porque','qual','quais'
]);

export function extractKeywords(text: string, max = 12): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9çãõáéíóúâêôü\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 5 && !STOP_WORDS.has(w));
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const sorted = Array.from(freq.entries()).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0, max).map(([w]) => w);
}


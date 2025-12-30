export interface ParsedBusinessMapCard {
  name: string;
  type: 'Backend' | 'Frontend' | 'Layout' | 'Fullstack';
  description: string;
}

/**
 * Parser simples para conteúdo de card gerado pelo agente
 */
export function parseBusinessMapCard(text: string): ParsedBusinessMapCard {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let name = '';
  let type = '' as ParsedBusinessMapCard['type'];
  let description = '';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('nome:')) {
      name = line.split(':').slice(1).join(':').trim();
    } else if (lower.startsWith('tipo:')) {
      const raw = line.split(':').slice(1).join(':').trim();
      const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      if (['Backend', 'Frontend', 'Layout', 'Fullstack'].includes(normalized)) {
        type = normalized as ParsedBusinessMapCard['type'];
      }
    } else if (lower.startsWith('descrição:') || lower.startsWith('descricao:')) {
      description = line.split(':').slice(1).join(':').trim();
    }
  }

  // Fallbacks básicos
  if (!name) {
    name = 'Card Gerado a partir de HU';
  }
  if (!type) {
    type = 'Fullstack';
  }
  if (!description) {
    description = 'Descrição não fornecida pelo agente';
  }

  return { name, type, description };
}


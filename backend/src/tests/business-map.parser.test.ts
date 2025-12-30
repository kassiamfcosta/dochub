import { describe, it, expect } from 'vitest';
import { parseBusinessMapCard } from '../utils/business-map';

describe('parseBusinessMapCard', () => {
  it('extrai Nome, Tipo e Descrição corretamente', () => {
    const text = `
      Nome: Login do Sistema
      Tipo: Backend
      Descrição: Implementar endpoints de autenticação
    `;
    const parsed = parseBusinessMapCard(text);
    expect(parsed.name).toBe('Login do Sistema');
    expect(parsed.type).toBe('Backend');
    expect(parsed.description).toBe('Implementar endpoints de autenticação');
  });

  it('aplica fallbacks quando campos não estão presentes', () => {
    const text = `
      Tipo: Layout
    `;
    const parsed = parseBusinessMapCard(text);
    expect(parsed.name).toBeTruthy();
    expect(parsed.type).toBe('Layout');
    expect(parsed.description).toBeTruthy();
  });
});


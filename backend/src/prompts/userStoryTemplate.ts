export const END_MARKER = '### FIM DO DOCUMENTO ###';

export function buildHUModelPrompt(context: string): string {
  const instructions = [
    'INSTRUÇÃO: Retorne SOMENTE as Histórias de Usuário completas no formato abaixo.',
    'Não inclua introduções, explicações, próximos passos ou observações fora das seções.',
    'Caso existam múltiplas HUs, retorne todas as HUs necessárias.',
    '',
    'Estrutura obrigatória por HU (na ordem):',
    '1. Nome da História de Usuário ([Funcionalidade] – [Ação principal])',
    '2. Versionamento (Versão: 1.0; Histórico de alteração quando houver evolução)',
    '3. História de usuário (Como [tipo de usuário], quero [funcionalidade] para [benefício])',
    '4. Tipo (Feature / Melhoria / Bug / Enabler)',
    '5. Critérios de aceitação (numerados, objetivos e verificáveis)',
    '6. Permissões e Acessos (indicar restrita/liberada; leitura/criação/edição/exclusão/exportação)',
    '7. Regras de negócio',
    '8. Requisitos técnicos (se nenhum, escrever exatamente: Nenhum requisito técnico foi identificado.)',
    '9. Regras de interface',
    '10. Campos e Componentes de UI (tabela Markdown: Campo | Tipo | Obrigatório | Regra/Restrição)',
    '11. Cenários de teste (BDD) com Dado/Quando/Então)',
    '',
    'Regras adicionais:',
    '- Identificar TODAS as HUs necessárias (telas, fluxos, permissões, relatórios, filtros, buscas, integrações).',
    '- Aplicar INVEST e sugerir divisão quando grande; apontar dependências e ordem quando houver.',
    '- Não mencionar ausência de acesso a arquivos.',
    '',
    `Finalize a saída escrevendo exatamente: ${END_MARKER}`,
  ].join('\n');

  return [
    'Contexto:',
    context || 'Sem contexto documental fornecido',
    '',
    instructions,
  ].join('\n');
}

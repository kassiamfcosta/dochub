/**
 * Utilitário de sanitização de texto para JSON
 * 
 * Remove emojis, normaliza quebras de linha, remove espaços múltiplos
 * e caracteres de controle que podem quebrar a estrutura JSON.
 */

/**
 * Sanitiza texto para ser compatível com JSON
 * @param content - Texto a ser sanitizado
 * @returns Texto limpo e compatível com JSON
 */
export function sanitizeTextForJson(content: string): string {
    if (!content) return '';

    let sanitized = content;

    // 1. Remove emojis comuns que quebram JSON
    sanitized = sanitized.replace(
        /[\u{1F4A9}\u{1F4DD}\u{1F4D0}\u{1F469}\u{1F468}\u{1F4BB}\u{1F4DD}\u{1F534}📝🔴✅❌⚠️💡🎯📋📌🚀✨🔥💻📊📈📉🎉👍👎🤔💬📧🔗]/gu,
        ''
    );

    // 2. Remove outros emojis (range completo)
    sanitized = sanitized.replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        ''
    );

    // 3. Normaliza quebras de linha (CRLF, LF, CR) para espaço único
    sanitized = sanitized.replace(/[\r\n]+/g, ' ');

    // 4. Remove espaços múltiplos
    sanitized = sanitized.replace(/ +/g, ' ');

    // 5. Remove caracteres de controle invisíveis (exceto tab e newline normais)
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    // 6. Remove aspas que podem quebrar JSON (substitui por aspas simples)
    // Nota: O JSON.stringify já faz escape, mas melhor prevenir
    sanitized = sanitized.replace(/"/g, "'");

    // 7. Remove barras invertidas soltas
    sanitized = sanitized.replace(/\\(?![nrt"\\])/g, '');

    return sanitized.trim();
}

/**
 * Valida se o texto pode ser usado em JSON
 * @param content - Texto a ser validado
 * @returns true se o texto é válido para JSON
 */
export function isValidJsonText(content: string): boolean {
    try {
        JSON.stringify({ text: content });
        return true;
    } catch {
        return false;
    }
}

/**
 * Sanitiza e valida texto para JSON
 * @param content - Texto a ser processado
 * @returns Texto sanitizado ou erro se inválido
 */
export function prepareTextForJson(content: string): string {
    const sanitized = sanitizeTextForJson(content);

    if (!isValidJsonText(sanitized)) {
        throw new Error('Texto não pôde ser sanitizado para JSON válido');
    }

    return sanitized;
}

export function cleanAgentOutput(text: string): string {
    if (!text) return '';
    let t = text.trim();
    const markers = [
        'História de Usuário',
        'Historia de Usuario',
        'User Story',
        'Resumo',
        'Cards',
        'Card'
    ];
    let startIdx = -1;
    for (const m of markers) {
        const idx = t.toLowerCase().indexOf(m.toLowerCase());
        if (idx !== -1 && (startIdx === -1 || idx < startIdx)) {
            startIdx = idx;
        }
    }
    if (startIdx > 0) {
        t = t.slice(startIdx);
    }
    t = t.replace(/^\s*(entendido[!.]?|ok[!.]?|certo[!.]?)[\s\S]*?(?=(história de usuário|historia de usuario|user story|resumo|cards|card))/i, '');
    // Remoção conservadora de cabeçalhos genéricos sem cortar conteúdo principal
    t = t.replace(/^\s*observaç(?:a|ã)o(?:es)?\s*:\s*/i, '');
    return t.trim();
}

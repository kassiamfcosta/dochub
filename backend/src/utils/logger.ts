
/**
 * Níveis de log disponíveis.
 */
enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

/**
 * Formata a mensagem de log com timestamp e nível.
 * @param level - O nível do log.
 * @param message - A mensagem principal.
 * @param details - Detalhes adicionais (objeto).
 * @returns A string de log formatada.
 */
const formatLog = (level: LogLevel, message: string, details?: object): string => {
  const timestamp = new Date().toISOString();
  // Converte detalhes para JSON, tratando o caso de ser undefined
  const detailsString = details ? JSON.stringify(details) : '';
  return `${timestamp} [${level}] - ${message}${detailsString ? ` - ${detailsString}` : ''}`;
};

/**
 * Um logger simples para console, sem emojis.
 */
export const logger = {
  info: (message: string, details?: object) => {
    console.log(formatLog(LogLevel.INFO, message, details));
  },
  warn: (message: string, details?: object) => {
    console.warn(formatLog(LogLevel.WARN, message, details));
  },
  error: (message: string, error?: Error | object, details?: object) => {
    const errorDetails = {
      ...details,
      errorMessage: error instanceof Error ? error.message : JSON.stringify(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    console.error(formatLog(LogLevel.ERROR, message, errorDetails));
  },
  debug: (message: string, details?: object) => {
    // O log de debug só é exibido se NODE_ENV não for 'production'
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog(LogLevel.DEBUG, message, details));
    }
  },
};

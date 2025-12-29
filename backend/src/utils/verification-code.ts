/**
 * Gera código de verificação de 6 dígitos numéricos
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calcula data de expiração (15 minutos a partir de agora)
 */
export function getExpirationDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + 15 * 60 * 1000); // 15 minutos
}


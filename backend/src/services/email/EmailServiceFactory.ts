import env from '../../config/env';
import { EmailService, BasicEmailService, NodemailerEmailService } from './EmailService';

/**
 * Factory Pattern: Cria instâncias de EmailService
 */
export class EmailServiceFactory {
  private static instance: EmailService | null = null;

  /**
   * Singleton Pattern: Retorna a mesma instância de EmailService
   */
  static create(): EmailService {
    if (!this.instance) {
      if (env.SMTP_HOST) {
        this.instance = new NodemailerEmailService();
      } else {
        this.instance = new BasicEmailService();
      }
    }
    return this.instance;
  }

  /**
   * Reseta a instância (útil para testes)
   */
  static reset(): void {
    this.instance = null;
  }
}


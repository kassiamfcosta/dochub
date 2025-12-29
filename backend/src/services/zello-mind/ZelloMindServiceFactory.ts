import { ZelloMindService } from './ZelloMindService';

/**
 * Factory Pattern: Cria instâncias de ZelloMindService
 */
export class ZelloMindServiceFactory {
  private static instance: ZelloMindService | null = null;

  /**
   * Singleton Pattern: Retorna a mesma instância de ZelloMindService
   */
  static create(): ZelloMindService {
    if (!this.instance) {
      this.instance = new ZelloMindService();
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


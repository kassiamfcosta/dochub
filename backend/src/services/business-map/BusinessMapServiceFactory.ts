import { BusinessMapService } from './BusinessMapService';

/**
 * Factory + Singleton para BusinessMapService
 */
export class BusinessMapServiceFactory {
  private static instance: BusinessMapService | null = null;

  static create(): BusinessMapService {
    if (!this.instance) {
      this.instance = new BusinessMapService();
    }
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}


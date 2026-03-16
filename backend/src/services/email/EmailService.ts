import nodemailer from 'nodemailer';
import env from '../../config/env';

/**
 * Interface para serviços de email
 * Strategy Pattern: diferentes implementações de envio de email
 */
export interface EmailService {
  sendVerificationCode(email: string, code: string): Promise<{ success: boolean; message: string }>;
}

/**
 * Implementação básica de EmailService
 * Em desenvolvimento: apenas simula o envio
 */
export class BasicEmailService implements EmailService {
  async sendVerificationCode(email: string, code: string): Promise<{ success: boolean; message: string }> {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment || !env.SMTP_HOST) {
      console.log(`[EMAIL SERVICE] Código de verificação para ${email}: ${code}`);
      console.log(`[EMAIL SERVICE] (Simulado) - configure SMTP para envio real`);
    } else {
      console.log(`[EMAIL SERVICE] SMTP não configurado corretamente. Código: ${code}`);
    }

    return {
      success: true,
      message: 'Código de verificação enviado (simulado)',
    };
  }
}

/**
 * Implementação de EmailService usando Nodemailer (SMTP)
 */
export class NodemailerEmailService implements EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const port = parseInt(env.SMTP_PORT || '587', 10);
    const secure = port === 465;

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS?.replace(/\s+/g, ''),
      },
    });

    console.log('[EMAIL SMTP] Configuração inicializada', {
      host: env.SMTP_HOST,
      port,
      secure,
      from: { name: env.SMTP_FROM_NAME || 'Doc Hub', address: env.SMTP_FROM || env.SMTP_USER },
      user: env.SMTP_USER,
    });
  }

  async sendVerificationCode(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[EMAIL SMTP] Enviando verificação', {
        to: email,
      });

      const fromAddress = env.SMTP_FROM || env.SMTP_USER || '';
      const fromName = env.SMTP_FROM_NAME || 'Doc Hub';
      await this.transporter.sendMail({
        from: { name: fromName, address: fromAddress },
        to: email,
        subject: 'Seu código de verificação - Doc Hub',
        text: `Seu código de verificação é: ${code}\n\nEste código expira em 15 minutos.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Doc Hub</h2>
            <p>Olá,</p>
            <p>Seu código de verificação é:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; background: #f3f4f6; padding: 10px; border-radius: 8px; display: inline-block;">${code}</h1>
            <p>Este código expira em 15 minutos.</p>
            <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">Se você não solicitou este código, ignore este email.</p>
          </div>
        `,
      });

      console.log(`[EMAIL SERVICE] Email enviado com sucesso para ${email}`);
      return { success: true, message: 'Email de verificação enviado com sucesso' };
    } catch (error) {
      console.error('[EMAIL SERVICE] Erro ao enviar email:', error);
      // Fallback para log em caso de erro, para não travar o usuário
      console.log(`[FALLBACK] Código para ${email}: ${code}`);
      return { success: false, message: 'Erro ao enviar email, mas o código foi gerado. Entre em contato com o suporte.' };
    }
  }
}


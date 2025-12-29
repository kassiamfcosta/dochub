import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('NodemailerEmailService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('envia email e usa texto com 15 minutos (porta 587)', async () => {
    vi.doMock('../config/env', () => ({
      default: {
        SMTP_HOST: 'smtp.test',
        SMTP_PORT: '587',
        SMTP_USER: 'user@test',
        SMTP_PASS: 'pass123',
        SMTP_FROM: 'from@test',
      },
    }));

    const sendMail = vi.fn().mockResolvedValue({});
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: vi.fn().mockReturnValue({ sendMail }),
      },
    }));

    const { NodemailerEmailService } = await import('../services/email/EmailService');
    const service = new NodemailerEmailService();
    const result = await service.sendVerificationCode('dest@test', '123456');

    expect(result.success).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const args = sendMail.mock.calls[0][0];
    expect(args.text).toContain('15 minutos');
    expect(args.subject).toContain('verificação');
    expect(args.to).toBe('dest@test');
  });

  it('usa secure=true quando porta 465', async () => {
    vi.doMock('../config/env', () => ({
      default: {
        SMTP_HOST: 'smtp.test',
        SMTP_PORT: '465',
        SMTP_USER: 'user@test',
        SMTP_PASS: 'pass123',
        SMTP_FROM: 'from@test',
      },
    }));

    const createTransport = vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({}),
    });
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport,
      },
    }));

    const { NodemailerEmailService } = await import('../services/email/EmailService');
    new NodemailerEmailService();

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 465,
        secure: true,
      })
    );
  });
});


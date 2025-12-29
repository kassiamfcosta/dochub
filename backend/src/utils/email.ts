import nodemailer from 'nodemailer';
import env from '../config/env';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

function getSmtpConfig() {
    const host = env.SMTP_HOST;
    const portRaw = env.SMTP_PORT ?? '587';
    const port = Number.parseInt(portRaw, 10);
    const secure = port === 465;

    const user = env.SMTP_USER;
    const pass = env.SMTP_PASS;
    const from = env.SMTP_FROM ?? user;

    if (!host) {
        throw new Error('Configuração de SMTP ausente: defina SMTP_HOST');
    }
    if (!Number.isFinite(port)) {
        throw new Error('Configuração de SMTP inválida: porta SMTP inválida');
    }
    if (!user || !pass) {
        throw new Error('Configuração de SMTP ausente: defina SMTP_USER e SMTP_PASS');
    }
    if (!from) {
        throw new Error('Configuração de SMTP ausente: defina SMTP_FROM');
    }

    return { host, port, secure, user, pass, from };
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
    if (cachedTransporter) return cachedTransporter;

    const smtp = getSmtpConfig();
    cachedTransporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
            user: smtp.user,
            pass: smtp.pass,
        },
    });

    return cachedTransporter;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
    try {
        const smtp = getSmtpConfig();
        const transporter = getTransporter();

        await transporter.sendMail({
            from: smtp.from,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
        console.log(`Email enviado para ${options.to}`);
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        throw new Error('Falha ao enviar email');
    }
}

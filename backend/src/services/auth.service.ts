import { db } from '../config/db';
import { users, passwordResetTokens } from '../config/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { hashPassword } from '../utils/password';
import { sendEmail } from '../utils/email';
import { ValidationError } from '../utils/errors';
import env from '../config/env';

export class AuthService {

    /**
     * Solicita a redefinição de senha para um usuário.
     * Gera um token, armazena no DB e envia um email com o link de redefinição.
     */
    static async requestPasswordReset(email: string): Promise<void> {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user) {
            // Para evitar enumeração de usuários, sempre retornamos sucesso, mesmo que o email não exista.
            // Isso é uma prática de segurança comum.
            console.warn(`Tentativa de redefinição de senha para email não existente: ${email}`);
            return;
        }

        // Gera um token único e com tempo de expiração (1 hora)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hora

        // Invalida tokens antigos para este usuário
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

        // Armazena o novo token no banco de dados
        await db.insert(passwordResetTokens).values({
            userId: user.id,
            token,
            expiresAt,
        });

        // Envia o email com o link de redefinição
        const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;
        await sendEmail({
            to: email,
            subject: 'Redefinição de Senha - Doc Hub',
            html: `
                <p>Você solicitou a redefinição de senha para sua conta no Doc Hub.</p>
                <p>Clique no link abaixo para redefinir sua senha:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>Este link expirará em 1 hora.</p>
                <p>Se você não solicitou esta redefinição, por favor, ignore este e-mail.</p>
            `,
        });
    }

    /**
     * Redefine a senha do usuário usando um token válido.
     */
    static async resetPassword(token: string, newPasswordPlain: string): Promise<void> {
        const resetToken = await db.query.passwordResetTokens.findFirst({
            where: eq(passwordResetTokens.token, token),
        });

        if (!resetToken || resetToken.expiresAt < new Date()) {
            throw new ValidationError('Token de redefinição de senha inválido ou expirado.');
        }

        const [user] = await db.select().from(users).where(eq(users.id, resetToken.userId)).limit(1);
        if (!user) {
          throw new ValidationError('Usuário associado ao token não encontrado.');
        }

        // Hash da nova senha
        const passwordHash = await hashPassword(newPasswordPlain);

        // Atualiza a senha do usuário
        await db.update(users)
          .set({ passwordHash, updatedAt: new Date() })
          .where(eq(users.id, user.id));

        // Invalida o token após o uso
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id));

        // Opcional: Enviar email de confirmação de redefinição de senha
        await sendEmail({
            to: user.email,
            subject: 'Senha Redefinida com Sucesso - Doc Hub',
            html: `
                <p>Sua senha para a conta no Doc Hub foi redefinida com sucesso.</p>
                <p>Se você não realizou esta ação, por favor, entre em contato conosco imediatamente.</p>
            `,
        });
    }
}

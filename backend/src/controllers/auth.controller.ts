import { Request, Response } from 'express';
import { db } from '../config/db';
import { users, emailVerificationCodes } from '../config/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { generateVerificationCode, getExpirationDate } from '../utils/verification-code';
import { EmailServiceFactory } from '../services/email/EmailServiceFactory';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import env from '../config/env';

function getTokenCookieOptions(req: Request) {
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  const forwardedProto = req.header('x-forwarded-proto');
  const requestIsSecure = req.secure || forwardedProto === 'https';
  const frontendUrl = env.FRONTEND_URL;
  const frontendIsHttps = typeof frontendUrl === 'string' && frontendUrl.startsWith('https://');

  const secure = requestIsSecure || frontendIsHttps;
  const sameSite = secure ? 'none' : 'lax';

  return { httpOnly: true, secure, sameSite, maxAge } as const;
}

/**
 * Controller de autenticação
 */
export class AuthController {
  /**
   * Registra um novo usuário e envia código de verificação
   */
  static async register(req: Request, res: Response): Promise<void> {
    const { email, password, name } = req.body;

    // Verifica se usuário já existe
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length > 0) {
      throw new ConflictError('Email já cadastrado');
    }

    // Cria hash da senha
    const passwordHash = await hashPassword(password);

    // Insere usuário (ainda não verificado)
    await db.insert(users).values({
      email,
      passwordHash,
      name: name || null,
      emailVerified: false,
    });

    // Gera código de verificação
    const code = generateVerificationCode();
    const expiresAt = getExpirationDate();

    // Remove códigos anteriores não verificados do mesmo email
    await db
      .delete(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.email, email),
          eq(emailVerificationCodes.verified, false)
        )
      );

    // Insere novo código
    await db.insert(emailVerificationCodes).values({
      email,
      code,
      expiresAt,
      verified: false,
    });

    // Envia código por email
    const emailService = EmailServiceFactory.create();
    const emailResult = await emailService.sendVerificationCode(email, code);

    const response: any = {
      success: true,
      message: 'Usuário registrado. Verifique seu email para o código de confirmação.',
      emailSent: emailResult.success,
      emailMessage: emailResult.message,
    };

    res.status(201).json(response);
  }

  /**
   * Reenvia código de verificação
   */
  static async resendVerificationCode(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    // Verifica se usuário existe
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      throw new NotFoundError('Email não cadastrado');
    }

    // Se já está verificado, não precisa reenviar
    if (user.emailVerified) {
      throw new ValidationError('Email já verificado. Você pode fazer login.');
    }

    // Gera novo código
    const code = generateVerificationCode();
    const expiresAt = getExpirationDate();

    // Remove códigos anteriores não verificados do mesmo email
    await db
      .delete(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.email, email),
          eq(emailVerificationCodes.verified, false)
        )
      );

    // Insere novo código
    await db.insert(emailVerificationCodes).values({
      email,
      code,
      expiresAt,
      verified: false,
    });

    // Envia código por email
    const emailService = EmailServiceFactory.create();
    const emailResult = await emailService.sendVerificationCode(email, code);

    const response: any = {
      success: true,
      message: 'Código de verificação reenviado. Verifique seu email.',
      emailSent: emailResult.success,
      emailMessage: emailResult.message,
    };

    res.json(response);
  }

  /**
   * Verifica código de email e autentica usuário
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    const { email, code } = req.body;

    // Busca código válido
    const verificationCode = await db
      .select()
      .from(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.email, email),
          eq(emailVerificationCodes.code, code),
          eq(emailVerificationCodes.verified, false),
          gt(emailVerificationCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (verificationCode.length === 0) {
      throw new ValidationError('Código inválido ou expirado');
    }

    // Marca código como verificado
    await db
      .update(emailVerificationCodes)
      .set({ verified: true })
      .where(eq(emailVerificationCodes.id, verificationCode[0].id));

    // Marca usuário como verificado
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, email));

    // Busca usuário atualizado (MySQL não suporta .returning())
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Gera token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Define cookie httpOnly
    res.cookie('token', token, {
      ...getTokenCookieOptions(req),
    });

    // Atualiza último acesso
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));

    res.json({
      success: true,
      message: 'Email verificado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  }

  /**
   * Login de usuário
   */
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    // Busca usuário
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      throw new NotFoundError('Email ou senha inválidos');
    }

    // Verifica senha
    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      throw new NotFoundError('Email ou senha inválidos');
    }

    // Verifica se email está verificado
    if (!user.emailVerified) {
      throw new ValidationError('Email não verificado. Verifique seu email primeiro.');
    }

    // Gera token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Define cookie httpOnly
    res.cookie('token', token, {
      ...getTokenCookieOptions(req),
    });

    // Atualiza último acesso
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  }

  /**
   * Logout de usuário
   */
  static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('token', {
      httpOnly: true,
      secure: getTokenCookieOptions(req).secure,
      sameSite: getTokenCookieOptions(req).sameSite,
    });
    res.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const { currentPassword, newPassword } = req.body;
    const [user] = await db.select().from(users).where(eq(users.id, req.user.userId)).limit(1);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const passwordMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      throw new ValidationError('Senha atual incorreta');
    }

    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

    res.json({ success: true, message: 'Senha alterada com sucesso' });
  }

  /**
   * Retorna informações do usuário autenticado
   */
  static async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    res.json({
      success: true,
      user,
    });
  }
}


import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { AuthenticationError } from '../utils/errors';

export type AuthenticatedRequest = Request & { user: JWTPayload };

/**
 * Estende o tipo Request do Express para incluir user
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware de autenticação JWT
 * Verifica o token JWT no cookie ou header Authorization
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Tenta obter token do cookie primeiro
    let token = req.cookies?.token;

    // Se não tiver no cookie, tenta no header Authorization
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new AuthenticationError('Token não fornecido');
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof Error && error.message.includes('Token')) {
      throw new AuthenticationError(error.message);
    }
    throw new AuthenticationError('Token inválido');
  }
};


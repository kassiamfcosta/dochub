import jwt, { SignOptions } from 'jsonwebtoken';
import env from '../config/env';

export interface JWTPayload {
  userId: number;
  email: string;
  role?: 'user' | 'admin';
}

/**
 * Gera um token JWT
 */
export function generateToken(payload: JWTPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verifica e decodifica um token JWT
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch {
    throw new Error('Token inválido ou expirado');
  }
}

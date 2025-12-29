import { RequestHandler } from 'express';

export const admin: RequestHandler = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Acesso negado. Rota exclusiva para administradores.' });
    return;
  }

  next();
};

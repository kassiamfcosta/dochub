import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

/**
 * Middleware de tratamento de erros global
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if ((err as any).name === 'MulterError') {
    const multerError = err as any;
    let message = 'Erro ao fazer upload dos arquivos';

    if (multerError.code === 'LIMIT_FILE_SIZE') {
      message = 'Arquivo muito grande. Tamanho máximo por arquivo é 10MB.';
    } else if (multerError.code === 'LIMIT_FILE_COUNT') {
      message = 'Muitos arquivos enviados. Máximo permitido é 5 arquivos.';
    }

    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  console.error('Erro não tratado:', err);

  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
  });
};


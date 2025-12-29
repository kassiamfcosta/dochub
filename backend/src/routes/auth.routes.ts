import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema, verifyEmailSchema, resendVerificationCodeSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../utils/validation';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';
import { AuthService } from '../services/auth.service';

const router = Router();

// Rate limiting para rotas de autenticação (5 tentativas por minuto)
const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: 'Muitas tentativas. Tente novamente em alguns minutos.',
});

/**
 * POST /api/auth/register
 * Registra um novo usuário
 */
router.post('/register', authRateLimit, validate(registerSchema), asyncHandler(AuthController.register));

/**
 * POST /api/auth/resend-verification-code
 * Reenvia código de verificação
 */
router.post('/resend-verification-code', authRateLimit, validate(resendVerificationCodeSchema), asyncHandler(AuthController.resendVerificationCode));

/**
 * POST /api/auth/verify-email
 * Verifica código de email
 */
router.post('/verify-email', authRateLimit, validate(verifyEmailSchema), asyncHandler(AuthController.verifyEmail));

/**
 * POST /api/auth/login
 * Login de usuário
 */
router.post('/login', authRateLimit, validate(loginSchema), asyncHandler(AuthController.login));

/**
 * POST /api/auth/forgot-password
 * Solicita redefinição de senha
 */
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), asyncHandler(async (req, res) => {
  await AuthService.requestPasswordReset(req.body.email);
  res.json({ success: true, message: 'Se um usuário com este e-mail for encontrado, um link de redefinição de senha será enviado.' });
}));

/**
 * POST /api/auth/reset-password
 * Redefine a senha do usuário
 */
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), asyncHandler(async (req, res) => {
  await AuthService.resetPassword(req.body.token, req.body.newPassword);
  res.json({ success: true, message: 'Sua senha foi redefinida com sucesso.' });
}));

/**
 * POST /api/auth/change-password
 * Altera a senha do usuário autenticado
 */
router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(AuthController.changePassword));

/**
 * POST /api/auth/logout
 * Logout de usuário
 */
router.post('/logout', authenticate, asyncHandler(AuthController.logout));

/**
 * GET /api/auth/me
 * Retorna informações do usuário autenticado
 */
router.get('/me', authenticate, asyncHandler(AuthController.me));

export default router;


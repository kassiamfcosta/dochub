import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { admin } from '../middlewares/admin';
import { asyncHandler } from '../utils/async-handler';
import { db } from '../config/db';
import { users, transcriptions } from '../config/db/schema';
import { count } from 'drizzle-orm';
import { AdminController } from '../controllers/admin.controller';

const router = Router();

/**
 * GET /api/admin/stats
 * Retorna estatísticas para o painel administrativo
 */
router.get('/stats', [authenticate, admin], asyncHandler(async (_req, res) => {
    const totalUsers = await db.select({ value: count() }).from(users);
    const totalTranscriptions = await db.select({ value: count() }).from(transcriptions);

    res.json({
        success: true,
        data: {
            totalUsers: totalUsers[0].value,
            totalTranscriptions: totalTranscriptions[0].value,
        },
    });
}));

/**
 * DELETE /api/admin/users/:id
 * Deleta um usuário pelo ID
 */
router.delete('/users/:id', [authenticate, admin], asyncHandler(AdminController.deleteUser));

/**
 * GET /api/admin/users
 * Retorna todos os usuários
 */
router.get('/users', [authenticate, admin], asyncHandler(AdminController.listUsers));

export default router;

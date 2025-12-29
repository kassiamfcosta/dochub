import { Request, Response } from 'express';
import { db } from '../config/db';
import { users } from '../config/db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../utils/errors';

export class AdminController {
  static async deleteUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      throw new NotFoundError('ID de usuário inválido');
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    await db.delete(users).where(eq(users.id, userId));

    res.json({
      success: true,
      message: 'Usuário deletado com sucesso',
    });
  }

  static async listUsers(_req: Request, res: Response): Promise<void> {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    }).from(users);

    res.json({
      success: true,
      data: allUsers,
    });
  }
}

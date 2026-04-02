import { db } from './index';
import { users } from './schema';
import { hashPassword } from '../../utils/password';
import { eq } from 'drizzle-orm';

/**
 * Script de seed para popular banco com dados de teste
 * ATENÇÃO: Execute apenas em ambiente de desenvolvimento
 */
async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Seed não deve ser executado em produção!');
    process.exit(1);
  }

  console.log('Iniciando seed...');

  try {
    // Deleta usuário de teste se existir
    await db.delete(users).where(eq(users.email, 'teste@zello.tec.br'));

    console.log('Usuário de teste existente removido (se houver).');

    // Cria usuário de teste
    await db.insert(users).values({
      email: 'teste@zello.tec.br',
      passwordHash: await hashPassword('senha123'),
      name: 'Usuário de Teste',
      emailVerified: true,
      role: 'admin',
    });

    // Busca o usuário inserido pelo email
    const [testUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'teste@zello.tec.br'))
      .limit(1);

    console.log('Usuário de teste criado:', testUser.email);
    console.log('Senha: senha123');

    console.log('Seed concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  }
}

seed().catch(console.error);

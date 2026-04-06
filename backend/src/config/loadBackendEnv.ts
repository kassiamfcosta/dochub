import path from 'path';
import { existsSync, readFileSync } from 'fs';
import dotenv from 'dotenv';

const BACKEND_PACKAGE_NAME = 'doc-hub-backend';

/**
 * Raiz do pacote backend (pasta com package.json e, em geral, o .env local).
 * Funciona com `tsx src/...`, com `node dist/...` e com drizzle-kit.
 *
 * Ordem de configuração: o que já está em `process.env` (Kubernetes, Docker,
 * cofre/ExternalSecret, CI) não é sobrescrito. O arquivo `backend/.env` só
 * preenche chaves ausentes — típico do desenvolvimento na máquina.
 */
function resolveBackendRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 20; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string };
        if (pkg.name === BACKEND_PACKAGE_NAME) {
          return dir;
        }
      } catch {
        /* ignora JSON inválido */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Raiz do backend (${BACKEND_PACKAGE_NAME}) não encontrada a partir de ${__dirname}`,
  );
}

export const BACKEND_ROOT = resolveBackendRoot();

/**
 * Carrega `backend/.env` e depois `.env` do cwd, sem sobrescrever variáveis
 * já definidas no ambiente (cluster, compose, shell).
 */
export function loadBackendEnv(): void {
  dotenv.config({ path: path.join(BACKEND_ROOT, '.env') });
  dotenv.config();
}

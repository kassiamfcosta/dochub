import path from 'path';
import { existsSync, readFileSync } from 'fs';
import dotenv from 'dotenv';

const BACKEND_PACKAGE_NAME = 'doc-hub-backend';

/**
 * Raiz do pacote backend (pasta com package.json e, em geral, o .env).
 * Funciona com `tsx src/...`, com `node dist/...` e com drizzle-kit.
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

/** Carrega backend/.env primeiro; depois complementa com .env do cwd (sem sobrescrever chaves já definidas). */
export function loadBackendEnv(): void {
  dotenv.config({ path: path.join(BACKEND_ROOT, '.env') });
  dotenv.config();
}

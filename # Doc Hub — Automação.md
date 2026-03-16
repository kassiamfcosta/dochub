# Doc Hub — Automação

Este documento consolida toda a automação do Doc Hub: setup, execução local, testes, CI/CD, Docker e deploy. Foque em comandos simples, padronização e segurança.

## Visão Geral

- Backend Node/TypeScript com Express e Drizzle ORM.
- Frontend React/Vite.
- Automação via Makefile e scripts de validação/setup.
- Execução com Docker Compose.
- Pipelines CI/CD em GitHub Actions e GitLab CI.
- Imagens Docker publicadas em registries (GHCR/GitLab).

## Componentes de Automação

- Scripts de setup e validação
  - Diretório: [setup-automation](file:///c:/Users/User/workspace/Doc%20Hub/automation-scripts/setup-automation)
  - Referência: [README_AUTOMACAO.md](file:///c:/Users/User/workspace/Doc%20Hub/automation-scripts/setup-automation/README_AUTOMACAO.md)
  - Conteúdo: `setup.sh`, `validate.sh`, `test-all.sh`, `Makefile`, `docker-compose.yml`, `*.Dockerfile`, `.env.docker`

- Makefile (raiz do projeto)
  - Comandos para setup, start, test, build, docker e banco
  - Referência: [Makefile](file:///c:/Users/User/workspace/Doc%20Hub/Makefile)

- Docker Compose (raiz)
  - Serviços: `mysql`, `backend`, `frontend`
  - Ports: MySQL 3306, Backend 3001, Frontend 5173
  - Referência: [docker-compose.yml](file:///c:/Users/User/workspace/Doc%20Hub/docker-compose.yml)

- Banco de Dados e Migrations (Drizzle)
  - Scripts: `db:generate`, `db:push`, `db:seed`
  - Referência: [package.json (backend)](file:///c:/Users/User/workspace/Doc%20Hub/backend/package.json), [drizzle/](file:///c:/Users/User/workspace/Doc%20Hub/backend/drizzle)

- Testes automatizados
  - Backend: Vitest
  - Frontend: Vitest com jsdom
  - Referências: [tests (backend)](file:///c:/Users/User/workspace/Doc%20Hub/backend/src/tests), [vitest.config.ts (backend)](file:///c:/Users/User/workspace/Doc%20Hub/backend/vitest.config.ts), [package.json (frontend)](file:///c:/Users/User/workspace/Doc%20Hub/frontend/package.json)

- CI/CD
  - GitHub Actions: build, test, release, imagens Docker e deploy HLG
    - Referências: [ci-hlg.yml](file:///c:/Users/User/workspace/Doc%20Hub/.github/workflows/ci-hlg.yml), [promote-prd.yml](file:///c:/Users/User/workspace/Doc%20Hub/.github/workflows/promote-prd.yml)
  - GitLab CI (backend e frontend): test, build, package, docker, deploy HLG e promoção PRD
    - Referências: [backend .gitlab-ci.yml](file:///c:/Users/User/workspace/Doc%20Hub/backend/.gitlab-ci.yml), [frontend .gitlab-ci.yml](file:///c:/Users/User/workspace/Doc%20Hub/frontend/.gitlab-ci.yml)

## Pré-requisitos

- Node.js 20+, npm
- Docker e Docker Compose (para execução isolada)
- MySQL 8 (local ou via Docker)
- Arquivos `.env` configurados
- Em Windows, preferir PowerShell/Git Bash para comandos; Make exige ambiente compatível (Git Bash/WSL)

## Fluxos Comuns

- Setup inicial
  - Windows (PowerShell):
    - Backend: `cd c:\Users\User\workspace\Doc Hub\backend; npm install`
    - Frontend: `cd c:\Users\User\workspace\Doc Hub\frontend; npm install`
    - Banco: `npm run db:generate && npm run db:push && npm run db:seed` (no backend)
  - Alternativa com Docker:
    - Copie `.env.docker` para `.env` nos serviços
    - `cd c:\Users\User\workspace\Doc Hub; docker-compose up -d`

- Desenvolvimento local
  - Backend: `cd c:\Users\User\workspace\Doc Hub\backend; npm run dev`
  - Frontend: `cd c:\Users\User\workspace\Doc Hub\frontend; npm run dev`
  - Acesso: Frontend http://localhost:5173, Backend http://localhost:3001

- Testes
  - Backend: `cd c:\Users\User\workspace\Doc Hub\backend; npm run test`
  - Frontend: `cd c:\Users\User\workspace\Doc Hub\frontend; npm run test`

- Build e Release
  - Backend: `npm run build` gera `dist`
  - Frontend: `npm run build` gera `dist`
  - CI empacota artefatos e publica imagens Docker (GHCR/GitLab Registry)

- Deploy HLG e Promoção PRD (CI)
  - GitHub: tag `vX.Y.Z` aciona build/test/release e deploy HLG; promoção PRD via workflow manual
  - GitLab: pipelines por tag; promoção PRD manual

## Variáveis de Ambiente

- Backend
  - Validadas em runtime via Zod
  - Referência: [env.ts](file:///c:/Users/User/workspace/Doc%20Hub/backend/src/config/env.ts)
  - Principais: `PORT`, `NODE_ENV`, `FRONTEND_URL`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, integrações Zello Mind e Business Map

- Frontend
  - `.env` para URL da API e configs do Vite (quando aplicável)

- Docker Compose
  - Use `.env` por serviço; não cometer credenciais reais
  - Ajuste `DATABASE_URL` do backend para apontar ao serviço `mysql`

## Comandos Úteis (Windows)

- Start Dev
  - `cd c:\Users\User\workspace\Doc Hub\backend; npm run dev`
  - `cd c:\Users\User\workspace\Doc Hub\frontend; npm run dev`

- Migrations/Seed (backend)
  - `npm run db:generate`
  - `npm run db:push`
  - `npm run db:seed`

- Docker
  - Subir: `cd c:\Users\User\workspace\Doc Hub; docker-compose up -d`
  - Logs: `docker-compose logs -f`
  - Parar: `docker-compose down`

## CI/CD — Detalhes

- GitHub Actions (tags `v*.*.*`)
  - Instala dependências e executa testes
  - Build e empacotamento de artefatos (`artifacts/backend-*.tar.gz`, `artifacts/frontend-*.tar.gz`)
  - Build/push de imagens Docker para GHCR:
    - Backend: `ghcr.io/<owner>/doc-hub-backend:<tag>`
    - Frontend: `ghcr.io/<owner>/doc-hub-frontend:<tag>`
  - Deploy HLG via SSH (segredos exigidos)
  - Promoção PRD via `workflow_dispatch` com `tag`

- GitLab CI
  - Estágios: `test`, `build`, `package`, `docker`, `deploy`
  - Regras por tag semântica `vX.Y.Z`
  - Release e deploy HLG automático; PRD manual
  - Login no registry, build e push de imagens por `CI_COMMIT_TAG`

## Segurança e Boas Práticas

- Nunca comitar `.env` com segredos; use templates (`.env.example`, `.env.docker`) e variáveis no CI
- JWT: use segredo com 30+ caracteres
- Não logar payloads sensíveis
- Erros retornam `{ success: false, message }` pelo middleware global

## Troubleshooting

- Portas em uso: ajuste portas ou finalize processos (Windows: `netstat -ano`, `taskkill /PID <pid> /F`)
- MySQL indisponível: verifique serviço Docker ou credenciais
- node_modules corrompido: `rm -rf node_modules` e `npm install` (ou `make clean` em ambiente com Make)
- Variáveis inválidas: checar mensagens de `env.ts` e corrigir `.env`

## Referências

- Automação Setup: [README_AUTOMACAO.md](file:///c:/Users/User/workspace/Doc%20Hub/automation-scripts/setup-automation/README_AUTOMACAO.md)
- Makefile: [Makefile](file:///c:/Users/User/workspace/Doc%20Hub/Makefile)
- Docker Compose: [docker-compose.yml](file:///c:/Users/User/workspace/Doc%20Hub/docker-compose.yml)
- CI GitHub: [ci-hlg.yml](file:///c:/Users/User/workspace/Doc%20Hub/.github/workflows/ci-hlg.yml), [promote-prd.yml](file:///c:/Users/User/workspace/Doc%20Hub/.github/workflows/promote-prd.yml)
- CI GitLab: [backend .gitlab-ci.yml](file:///c:/Users/User/workspace/Doc%20Hub/backend/.gitlab-ci.yml), [frontend .gitlab-ci.yml](file:///c:/Users/User/workspace/Doc%20Hub/frontend/.gitlab-ci.yml)
- Backend env: [env.ts](file:///c:/Users/User/workspace/Doc%20Hub/backend/src/config/env.ts)
 
 ## Exposição via Ngrok
 
 - Script de automação: [ngrok-expose.ps1](file:///c:/Users/User/workspace/Doc%20Hub/automation-scripts/ngrok-expose.ps1)
 - Função: cria túneis seguros para o Frontend (5173) e Backend (3001), com suporte a autenticação básica, domínios reservados, logs e captura das URLs públicas.
 
 ### Pré-requisitos
 - Instale o Ngrok e autentique com seu token:
 
 ```powershell
 winget install --id Ngrok.Ngrok -e
 ngrok config add-authtoken "<SEU_TOKEN_NGROK>"
 ```
 
 ### Execução rápida
 - Expor Frontend e Backend, capturando URLs:
 
 ```powershell
 cd c:\Users\User\workspace\Doc Hub
 powershell -ExecutionPolicy Bypass -File .\automation-scripts\ngrok-expose.ps1 -FrontendPort 5173 -BackendPort 3001
 ```
 
 - As URLs públicas são salvas em: [ngrok-urls.json](file:///c:/Users/User/workspace/Doc%20Hub/automation-scripts/ngrok-urls.json)
 
 ### Segurança (opcional)
 - Habilitar autenticação básica:
 
 ```powershell
 powershell -ExecutionPolicy Bypass -File .\automation-scripts\ngrok-expose.ps1 `
   -BasicAuthUser "usuario" -BasicAuthPass "senha"
 ```
 
 - Domínio reservado (requer plano/permite URLs consistentes):
 
 ```powershell
 powershell -ExecutionPolicy Bypass -File .\automation-scripts\ngrok-expose.ps1 `
   -ReservedFrontendDomain "meu-front.ngrok.app" `
   -ReservedBackendDomain  "minha-api.ngrok.app"
 ```
 
 ### Ajustes de ambiente
 - Backend: defina `FRONTEND_URL` para a URL pública do frontend (CORS).
 - Frontend: defina `VITE_API_URL` para a URL pública do backend (Axios baseURL).
 - Em Docker Compose, ajuste variáveis no `.env` de cada serviço.
 
 ### Verificação e testes
 - Verifique o serviço local antes do túnel:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:3001/health`
 - Após iniciar os túneis, acesse as URLs públicas geradas e valide:
   - Autenticação/login
   - Upload/geração de transcrições
   - Dashboard e navegação
 - Avalie latência e desempenho com as URLs públicas.
 
 ### Monitoramento e logs
 - Logs do Ngrok: `c:\Users\User\workspace\Doc Hub\logs\ngrok.log`
 - Use o inspector local do Ngrok: `http://127.0.0.1:4040`
 - Para quedas, reinicie o script; implementar agendamento com `Task Scheduler` é recomendado.
 
 ### Procedimentos de manutenção
 - Atualizar token/dominios reservados no comando de execução.
 - Reiniciar túneis após alterações de ambiente (CORS/URLs).
 - Não exponha segredos em logs ou parâmetros públicos.

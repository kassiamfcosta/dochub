# Zello Transcription Hub

Sistema web full-stack para gerenciar transcrições de reuniões com geração automática de Histórias de Usuário e Resumos utilizando a API Zello Mind.

## Estrutura do Projeto

```
projeto/
├── backend/              # API REST independente
│   ├── src/
│   │   ├── config/       # Configurações (DB, Zello Mind, JWT)
│   │   ├── controllers/  # Lógica de controle
│   │   ├── models/       # Modelos do banco (ORM)
│   │   ├── routes/       # Rotas da API REST
│   │   ├── services/     # Serviços (Zello Mind, Email)
│   │   ├── middlewares/  # Auth, validação, error handling
│   │   ├── utils/        # Helpers
│   │   └── tests/        # Testes unitários e integração
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/             # SPA independente
│   ├── src/
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── pages/        # Páginas (Login, Dashboard, etc)
│   │   ├── services/     # Chamadas à API
│   │   ├── contexts/     # Context API (Auth, etc)
│   │   ├── hooks/        # Custom hooks
│   │   ├── utils/        # Helpers
│   │   └── styles/       # CSS/Tailwind
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── docs/                 # Documentação
    ├── API.md            # Documentação da API REST
    ├── AGENTES.md        # Configuração dos agentes Zello Mind
    └── SETUP.md          # Guia de instalação e deploy
```

## Tecnologias

### Backend
- Node.js 18+ com TypeScript
- Express.js 4 (API REST)
- Drizzle ORM (MySQL)
- JWT (jsonwebtoken) + bcryptjs
- Zod (validação)
- Vitest (testes)
- Axios (cliente HTTP para Zello Mind)

### Frontend
- React 18+ com TypeScript
- React Router v6
- Tailwind CSS 4
- shadcn/ui (componentes)
- Context API + React Query (state)
- react-markdown (renderização Markdown)
- Axios (cliente HTTP)

### Banco de Dados
- MySQL 8

## Instalação

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edite o .env com suas configurações
npm run db:migrate
npm run db:seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edite o .env com a URL da API
npm run dev
```

## Documentação

Consulte a pasta `docs/` para documentação detalhada:
- `SETUP.md` - Guia completo de instalação e deploy
- `API.md` - Documentação da API REST
- `AGENTES.md` - Configuração dos agentes Zello Mind

## Desenvolvimento

### Backend

```bash
npm run dev          # Inicia servidor em modo watch
npm run build        # Build para produção
npm run test         # Executa testes
npm run db:migrate   # Roda migrations
npm run db:seed      # Popula banco com dados de teste
```

### Frontend

```bash
npm run dev          # Inicia dev server (Vite)
npm run build        # Build para produção
npm run preview      # Preview do build
npm run test         # Executa testes
```

## Licença

ISC


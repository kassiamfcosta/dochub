# Guia de Instalação e Deploy

Este guia fornece instruções passo a passo para configurar e executar o Doc Hub em ambiente de desenvolvimento e produção.

## Pré-requisitos

### Desenvolvimento

- Node.js 18+ e npm
- MySQL 8+
- Git

### Produção

- Node.js 18+ e npm
- MySQL 8+
- Servidor web (Nginx recomendado)
- PM2 ou similar para gerenciamento de processos

---

## Instalação - Desenvolvimento

### 1. Clone o Repositório

```bash
git clone <url-do-repositorio>
cd storyforge
```

### 2. Configuração do Backend

```bash
cd backend
npm install
```

Crie o arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

Edite o `.env` com suas configurações:

```env
# Servidor
PORT=3001
NODE_ENV=development

# Banco de Dados
DATABASE_URL=mysql://usuario:senha@localhost:3306/zello_transcription_hub

# JWT
JWT_SECRET=,8n=RP#O0/O9I'Hg:~.]7a,"ZfS^v8
JWT_EXPIRES_IN=7d

# Agentes de IA (pré-configurados)
ZELLO_API_URL=https://smartdocs-api-hlg.zello.space
AGENT_HU_ID=692704d81c546166c00f0188
AGENT_RESUMO_ID=692701451c546166c00efdf4
AGENT_CARDS_ID=69261314fffadaeffcb2387c
```

### 3. Configuração do Banco de Dados

Crie o banco de dados MySQL:

```sql
CREATE DATABASE zello_transcription_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Execute as migrations:

```bash
npm run db:generate  # Gera arquivos de migration
npm run db:push      # Aplica migrations no banco
```

### 4. Configuração do Frontend

```bash
cd ../frontend
npm install
```

Crie o arquivo `.env`:

```bash
cp .env.example .env
```

Edite o `.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

### 5. Executar em Desenvolvimento

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

O backend estará disponível em `http://localhost:3001` e o frontend em `http://localhost:5173`.

---

## Instalação - Produção

### 1. Build do Backend

```bash
cd backend
npm install --production
npm run build
```

### 2. Build do Frontend

```bash
cd frontend
npm install
npm run build
```

Os arquivos estáticos estarão em `frontend/dist/`.

### 3. Configuração do Servidor

#### Opção A: Usando PM2

Instale o PM2 globalmente:

```bash
npm install -g pm2
```

Inicie o backend:

```bash
cd backend
pm2 start dist/index.js --name zello-backend
pm2 save
pm2 startup
```

#### Opção B: Usando Systemd

Crie o arquivo `/etc/systemd/system/zello-backend.service`:

```ini
[Unit]
Description=Zello Transcription Hub Backend
After=network.target

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/caminho/para/backend
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Inicie o serviço:

```bash
sudo systemctl enable zello-backend
sudo systemctl start zello-backend
```

### 4. Configuração do Nginx

Crie o arquivo `/etc/nginx/sites-available/zello-transcription-hub`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Frontend
    location / {
        root /caminho/para/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Ative a configuração:

```bash
sudo ln -s /etc/nginx/sites-available/zello-transcription-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Configuração SSL (Recomendado)

Use Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

---

## Variáveis de Ambiente

### Backend

| Variável | Descrição | Obrigatório | Padrão |
|----------|-----------|-------------|--------|
| `PORT` | Porta do servidor | Não | 3001 |
| `NODE_ENV` | Ambiente (development/production) | Não | development |
| `DATABASE_URL` | URL de conexão MySQL | Sim | - |
| `JWT_SECRET` | Secret para assinatura JWT | Sim | - |
| `JWT_EXPIRES_IN` | Validade do token JWT | Não | 7d |
| `ZELLO_API_URL` | URL base da API de Agentes | Não | <https://smartdocs-api-hlg.zello.space> |
| `AGENT_HU_ID` | ID do agente Gerador de HU | Sim | - |
| `AGENT_RESUMO_ID` | ID do agente Gerador de Resumo | Sim | - |
| `AGENT_CARDS_ID` | ID do agente Gerador de Cards | Sim | - |
| `SMTP_HOST` | Host SMTP (opcional) | Não | - |
| `SMTP_PORT` | Porta SMTP (opcional) | Não | - |
| `SMTP_USER` | Usuário SMTP (opcional) | Não | - |
| `SMTP_PASS` | Senha SMTP (opcional) | Não | - |

### Frontend

| Variável | Descrição | Obrigatório | Padrão |
|----------|-----------|-------------|--------|
| `VITE_API_URL` | URL da API Backend | Sim | - |

---

## Troubleshooting

### Erro de Conexão com Banco de Dados

1. Verifique se o MySQL está rodando:

   ```bash
   sudo systemctl status mysql
   ```

2. Verifique as credenciais no `.env`

3. Teste a conexão:

   ```bash
   mysql -u usuario -p -h localhost zello_transcription_hub
   ```

### Erro de CORS

Certifique-se de que a variável `FRONTEND_URL` no backend está configurada corretamente.

### Erro ao Gerar HU/Resumo

1. Verifique se os IDs dos agentes estão configurados (`AGENT_HU_ID`, `AGENT_RESUMO_ID`, `AGENT_CARDS_ID`)
2. Verifique se `ZELLO_API_URL` está correta
3. Verifique os logs do backend para mais detalhes

### Erro de Autenticação

1. Verifique se `JWT_SECRET` está configurado
2. Limpe os cookies do navegador
3. Verifique se o token não expirou

---

## Testes

### Backend

```bash
cd backend
npm run test
npm run test:coverage
```

### Frontend

```bash
cd frontend
npm run test
```

---

## Backup do Banco de Dados

```bash
mysqldump -u usuario -p zello_transcription_hub > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Restauração do Banco de Dados

```bash
mysql -u usuario -p zello_transcription_hub < backup_20240101_120000.sql
```

---

## Atualização

1. Faça backup do banco de dados
2. Pare os serviços
3. Atualize o código:

   ```bash
   git pull
   ```

4. Instale dependências:

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

5. Execute migrations (se houver):

   ```bash
   cd backend && npm run db:push
   ```

6. Faça build:

   ```bash
   cd backend && npm run build
   cd ../frontend && npm run build
   ```

7. Reinicie os serviços

---

## Suporte

Para problemas ou dúvidas, consulte:

- Documentação da API: `docs/API.md`
- Configuração dos Agentes: `docs/AGENTES.md`
- README principal: `README.md`

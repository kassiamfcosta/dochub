# 🤖 Scripts de Automação - Zello Transcription Hub

Este diretório contém scripts para automatizar o setup, testes e deploy do projeto.

---

## 📋 Arquivos Incluídos

| Arquivo | Descrição |
|---------|-----------|
| `setup.sh` | Setup automático completo (instalar + configurar + migrations) |
| `validate.sh` | Validação de configuração e dependências |
| `test-all.sh` | Execução de todos os testes automatizados |
| `Makefile` | Comandos simplificados para todas as operações |
| `docker-compose.yml` | Orquestração de containers (MySQL + Backend + Frontend) |
| `backend.Dockerfile` | Dockerfile para o backend |
| `frontend.Dockerfile` | Dockerfile para o frontend |
| `.env.docker` | Template de variáveis de ambiente para Docker |

---

## 🚀 Uso Rápido

### Opção 1: Setup Manual com Scripts

```bash
# 1. Dar permissão de execução
chmod +x setup.sh validate.sh test-all.sh

# 2. Executar setup completo
./setup.sh

# 3. Validar configuração
./validate.sh

# 4. Iniciar servidores (em terminais separados)
cd backend && npm run dev
cd frontend && npm run dev
```

### Opção 2: Usando Makefile (Recomendado)

```bash
# Ver todos os comandos disponíveis
make help

# Setup completo
make setup

# Validar configuração
make validate

# Iniciar backend e frontend (em paralelo)
make start

# Executar testes
make test

# Parar servidores
make stop

# Limpar node_modules e builds
make clean
```

### Opção 3: Usando Docker (Mais Simples)

```bash
# 1. Copiar e configurar variáveis de ambiente
cp .env.docker .env
# Edite .env com suas credenciais

# 2. Iniciar tudo (MySQL + Backend + Frontend)
make docker-up
# ou
docker-compose up -d

# 3. Ver logs
make docker-logs
# ou
docker-compose logs -f

# 4. Parar tudo
make docker-down
# ou
docker-compose down
```

---

## 📦 Comandos do Makefile

### Comandos Principais

```bash
make setup          # Setup completo (instalar + configurar + migrations)
make start          # Iniciar backend e frontend
make stop           # Parar todos os servidores
make test           # Executar todos os testes
make validate       # Validar configuração
make clean          # Limpar node_modules e builds
```

### Comandos Docker

```bash
make docker-up      # Iniciar com Docker Compose
make docker-down    # Parar containers
make docker-logs    # Ver logs dos containers
make docker-restart # Reiniciar containers
```

### Comandos de Banco de Dados

```bash
make db-migrate     # Executar migrations
make db-seed        # Popular com dados de teste
make db-reset       # Resetar banco (drop + migrate + seed)
```

### Comandos Individuais

```bash
make install        # Instalar dependências
make start-backend  # Iniciar apenas backend
make start-frontend # Iniciar apenas frontend
make test-backend   # Testar apenas backend
make test-frontend  # Testar apenas frontend
make build          # Build para produção
```

---

## 🐳 Docker Compose

### Estrutura

O `docker-compose.yml` cria 3 serviços:

1. **mysql** - Banco de dados MySQL 8.0
2. **backend** - API Node.js/Express
3. **frontend** - React/Vite

### Portas

- MySQL: `3306`
- Backend: `3001`
- Frontend: `5173`

### Volumes

- `mysql_data` - Persistência dos dados do MySQL

### Configuração

1. Copie `.env.docker` para `.env`:
   ```bash
   cp .env.docker .env
   ```

2. Edite `.env` com suas credenciais:
   ```env
   JWT_SECRET=seu_secret_aqui
   ZELLO_MIND_API_KEY=sua_chave_api
   MYSQL_ROOT_PASSWORD=senha_root
   MYSQL_PASSWORD=senha_usuario
   ```

3. Inicie os containers:
   ```bash
   docker-compose up -d
   ```

4. Acesse:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

---

## 🔍 Script de Validação

O `validate.sh` verifica:

- ✅ Node.js 18+ instalado
- ✅ npm instalado
- ✅ MySQL disponível
- ✅ Estrutura de pastas correta
- ✅ package.json presentes
- ✅ node_modules instalados
- ✅ Arquivos .env configurados
- ✅ Variáveis críticas definidas
- ✅ Conexão com banco de dados
- ✅ Configurações TypeScript
- ✅ Documentação presente

### Uso

```bash
chmod +x validate.sh
./validate.sh
```

---

## 🧪 Script de Testes

O `test-all.sh` executa:

1. Testes unitários do backend
2. Testes unitários do frontend
3. Gera relatório consolidado

### Uso

```bash
chmod +x test-all.sh
./test-all.sh
```

---

## 📝 Notas Importantes

### Permissões

Todos os scripts `.sh` precisam de permissão de execução:

```bash
chmod +x *.sh
```

### Variáveis de Ambiente

**Nunca commite arquivos `.env` com credenciais reais!**

Use sempre `.env.example` como template.

### Docker vs Manual

| Aspecto | Docker | Manual |
|---------|--------|--------|
| Setup | Mais rápido | Mais controle |
| Isolamento | Total | Compartilhado |
| Debugging | Mais difícil | Mais fácil |
| Produção | Recomendado | Possível |

### Troubleshooting

**Problema: Porta já em uso**
```bash
# Verificar processos na porta
lsof -i :3001  # Backend
lsof -i :5173  # Frontend
lsof -i :3306  # MySQL

# Matar processo
kill -9 <PID>
```

**Problema: MySQL não conecta**
```bash
# Verificar status do MySQL
systemctl status mysql

# Iniciar MySQL
systemctl start mysql

# Ou usar Docker
docker-compose up -d mysql
```

**Problema: node_modules corrompido**
```bash
make clean
make install
```

---

## 🎯 Fluxo Recomendado

### Primeira Vez

1. `make setup` - Setup completo
2. `make validate` - Validar configuração
3. `make test` - Executar testes
4. `make start` - Iniciar servidores

### Desenvolvimento Diário

```bash
# Opção 1: Manual
make start

# Opção 2: Docker
make docker-up
```

### Antes de Commitar

```bash
make test
make validate
```

### Deploy

```bash
make build
# Seguir instruções de deploy específicas
```

---

## 📚 Recursos Adicionais

- [Documentação do Projeto](../README.md)
- [API Documentation](../docs/API.md)
- [Setup Guide](../docs/SETUP.md)
- [Agentes Zello Mind](../docs/AGENTES.md)

---

## 🤝 Contribuindo

Ao adicionar novos scripts:

1. Adicione ao Makefile
2. Documente neste README
3. Adicione exemplos de uso
4. Teste em ambiente limpo

---

**Dica:** Use `make help` para ver todos os comandos disponíveis!

.PHONY: help setup install start stop test clean docker-up docker-down docker-logs validate

# Variáveis
BACKEND_DIR = backend
FRONTEND_DIR = frontend

help: ## Mostra esta mensagem de ajuda
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## Setup completo (instalar + configurar + migrations)
	@echo "🚀 Iniciando setup completo..."
	@chmod +x setup.sh
	@./setup.sh

install: ## Instalar dependências (backend + frontend)
	@echo "📦 Instalando dependências..."
	@cd $(BACKEND_DIR) && npm install
	@cd $(FRONTEND_DIR) && npm install
	@echo "✅ Dependências instaladas"

start: ## Iniciar backend e frontend (em paralelo)
	@echo "🚀 Iniciando servidores..."
	@make -j2 start-backend start-frontend

start-backend: ## Iniciar apenas backend
	@echo "🔧 Iniciando backend..."
	@cd $(BACKEND_DIR) && npm run dev

start-frontend: ## Iniciar apenas frontend
	@echo "🎨 Iniciando frontend..."
	@cd $(FRONTEND_DIR) && npm run dev

stop: ## Parar todos os servidores
	@echo "🛑 Parando servidores..."
	@pkill -f "node.*backend" || true
	@pkill -f "vite" || true
	@echo "✅ Servidores parados"

test: ## Executar todos os testes
	@echo "🧪 Executando testes..."
	@cd $(BACKEND_DIR) && npm run test
	@echo "✅ Testes concluídos"

test-backend: ## Executar testes do backend
	@cd $(BACKEND_DIR) && npm run test

test-frontend: ## Executar testes do frontend
	@cd $(FRONTEND_DIR) && npm run test

validate: ## Validar configuração e dependências
	@echo "🔍 Validando configuração..."
	@chmod +x validate.sh
	@./validate.sh

clean: ## Limpar node_modules e builds
	@echo "🧹 Limpando projeto..."
	@rm -rf $(BACKEND_DIR)/node_modules
	@rm -rf $(FRONTEND_DIR)/node_modules
	@rm -rf $(BACKEND_DIR)/dist
	@rm -rf $(FRONTEND_DIR)/dist
	@echo "✅ Projeto limpo"

docker-up: ## Iniciar com Docker Compose
	@echo "🐳 Iniciando containers Docker..."
	@docker-compose up -d
	@echo "✅ Containers iniciados"
	@echo "Backend: http://localhost:3001"
	@echo "Frontend: http://localhost:5173"

docker-down: ## Parar containers Docker
	@echo "🐳 Parando containers Docker..."
	@docker-compose down
	@echo "✅ Containers parados"

docker-logs: ## Ver logs dos containers
	@docker-compose logs -f

docker-restart: ## Reiniciar containers Docker
	@make docker-down
	@make docker-up

db-migrate: ## Executar migrations do banco
	@echo "🗄️  Executando migrations..."
	@cd $(BACKEND_DIR) && npm run db:generate && npm run db:push
	@echo "✅ Migrations executadas"

db-seed: ## Popular banco com dados de teste
	@echo "🌱 Populando banco de dados..."
	@cd $(BACKEND_DIR) && npm run db:seed
	@echo "✅ Dados de teste inseridos"

db-reset: ## Resetar banco de dados (drop + migrate + seed)
	@echo "⚠️  Resetando banco de dados..."
	@cd $(BACKEND_DIR) && npm run db:drop && npm run db:push && npm run db:seed
	@echo "✅ Banco resetado"

build: ## Build para produção (backend + frontend)
	@echo "🏗️  Building para produção..."
	@cd $(BACKEND_DIR) && npm run build
	@cd $(FRONTEND_DIR) && npm run build
	@echo "✅ Build concluído"

dev: start ## Alias para 'make start'

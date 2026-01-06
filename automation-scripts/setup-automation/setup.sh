#!/bin/bash

# Script de Setup Automático - Zello Transcription Hub
# Automatiza instalação, configuração e inicialização do projeto

set -e  # Para execução ao primeiro erro

echo "🚀 Iniciando setup automático do Zello Transcription Hub..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para printar com cor
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    print_error "Node.js não está instalado. Instale Node.js 18+ primeiro."
    exit 1
fi
print_success "Node.js encontrado: $(node --version)"

# Verificar se MySQL está instalado
if ! command -v mysql &> /dev/null; then
    print_warning "MySQL não encontrado. Certifique-se de ter um servidor MySQL rodando."
else
    print_success "MySQL encontrado: $(mysql --version)"
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    print_error "npm não está instalado."
    exit 1
fi
print_success "npm encontrado: $(npm --version)"

echo ""
echo "📦 Instalando dependências do Backend..."
cd backend
if [ ! -f "package.json" ]; then
    print_error "package.json não encontrado no diretório backend"
    exit 1
fi
npm install
print_success "Dependências do backend instaladas"

echo ""
echo "📦 Instalando dependências do Frontend..."
cd ../frontend
if [ ! -f "package.json" ]; then
    print_error "package.json não encontrado no diretório frontend"
    exit 1
fi
npm install
print_success "Dependências do frontend instaladas"

echo ""
echo "⚙️  Configurando variáveis de ambiente..."

# Backend .env
cd ../backend
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning ".env criado no backend. EDITE COM SUAS CREDENCIAIS antes de continuar!"
        echo ""
        echo "Edite backend/.env e configure:"
        echo "  - DATABASE_URL (MySQL)"
        echo "  - JWT_SECRET (gere um secret seguro)"
        echo "  - ZELLO_API_KEY (sua chave da API)"
        echo ""
        read -p "Pressione ENTER após editar o .env..."
    else
        print_error ".env.example não encontrado no backend"
        exit 1
    fi
else
    print_success ".env já existe no backend"
fi

# Frontend .env
cd ../frontend
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env criado no frontend"
    else
        print_error ".env.example não encontrado no frontend"
        exit 1
    fi
else
    print_success ".env já existe no frontend"
fi

echo ""
echo "🗄️  Configurando banco de dados..."
cd ../backend

# Ler DATABASE_URL do .env
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL não configurado no .env"
    exit 1
fi

# Extrair nome do banco de dados da URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Nome do banco: $DB_NAME"
read -p "Deseja criar o banco de dados '$DB_NAME' agora? (s/n): " CREATE_DB

if [ "$CREATE_DB" = "s" ] || [ "$CREATE_DB" = "S" ]; then
    echo "Digite a senha do root do MySQL:"
    mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    print_success "Banco de dados '$DB_NAME' criado"
fi

echo ""
echo "🔄 Executando migrations..."
npm run db:generate
npm run db:push
print_success "Migrations executadas"

echo ""
read -p "Deseja popular o banco com dados de teste? (s/n): " SEED_DB

if [ "$SEED_DB" = "s" ] || [ "$SEED_DB" = "S" ]; then
    if npm run | grep -q "db:seed"; then
        npm run db:seed
        print_success "Dados de teste inseridos"
    else
        print_warning "Script db:seed não encontrado"
    fi
fi

echo ""
echo "✅ Setup concluído com sucesso!"
echo ""
echo "Para iniciar o sistema:"
echo "  1. Backend:  cd backend && npm run dev"
echo "  2. Frontend: cd frontend && npm run dev"
echo ""
echo "Ou use: ./start.sh (se disponível)"

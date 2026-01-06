#!/bin/bash

# Script de Validação Automática - Zello Transcription Hub
# Verifica se tudo está configurado corretamente

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

ERRORS=0
WARNINGS=0

echo "🔍 Iniciando validação do projeto..."
echo ""

# 1. Verificar Node.js
echo "1️⃣  Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_success "Node.js $(node --version) instalado"
    else
        print_error "Node.js versão 18+ necessária. Versão atual: $(node --version)"
        ((ERRORS++))
    fi
else
    print_error "Node.js não encontrado"
    ((ERRORS++))
fi

# 2. Verificar npm
echo "2️⃣  Verificando npm..."
if command -v npm &> /dev/null; then
    print_success "npm $(npm --version) instalado"
else
    print_error "npm não encontrado"
    ((ERRORS++))
fi

# 3. Verificar MySQL
echo "3️⃣  Verificando MySQL..."
if command -v mysql &> /dev/null; then
    print_success "MySQL encontrado"
else
    print_warning "MySQL não encontrado (pode estar usando Docker)"
    ((WARNINGS++))
fi

# 4. Verificar estrutura de pastas
echo "4️⃣  Verificando estrutura de pastas..."
if [ -d "backend" ] && [ -d "frontend" ]; then
    print_success "Estrutura de pastas OK"
else
    print_error "Pastas backend/ ou frontend/ não encontradas"
    ((ERRORS++))
fi

# 5. Verificar package.json
echo "5️⃣  Verificando package.json..."
if [ -f "backend/package.json" ] && [ -f "frontend/package.json" ]; then
    print_success "package.json encontrados"
else
    print_error "package.json não encontrado em backend/ ou frontend/"
    ((ERRORS++))
fi

# 6. Verificar node_modules
echo "6️⃣  Verificando node_modules..."
if [ -d "backend/node_modules" ]; then
    print_success "Backend: node_modules instalado"
else
    print_warning "Backend: node_modules não encontrado. Execute 'npm install' no backend/"
    ((WARNINGS++))
fi

if [ -d "frontend/node_modules" ]; then
    print_success "Frontend: node_modules instalado"
else
    print_warning "Frontend: node_modules não encontrado. Execute 'npm install' no frontend/"
    ((WARNINGS++))
fi

# 7. Verificar .env
echo "7️⃣  Verificando arquivos .env..."
if [ -f "backend/.env" ]; then
    print_success "Backend: .env encontrado"
    
    # Verificar variáveis críticas
    if grep -q "DATABASE_URL=" backend/.env && \
       grep -q "JWT_SECRET=" backend/.env && \
       grep -q "ZELLO_API_KEY=" backend/.env; then
        print_success "Backend: Variáveis críticas configuradas"
    else
        print_warning "Backend: Algumas variáveis críticas podem estar faltando"
        ((WARNINGS++))
    fi
else
    print_error "Backend: .env não encontrado"
    ((ERRORS++))
fi

if [ -f "frontend/.env" ]; then
    print_success "Frontend: .env encontrado"
else
    print_warning "Frontend: .env não encontrado"
    ((WARNINGS++))
fi

# 8. Verificar conexão com banco (se possível)
echo "8️⃣  Verificando conexão com banco de dados..."
if [ -f "backend/.env" ]; then
    export $(grep -v '^#' backend/.env | xargs)
    if [ ! -z "$DATABASE_URL" ]; then
        # Extrair credenciais da URL
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        
        if command -v nc &> /dev/null; then
            if nc -z $DB_HOST $DB_PORT 2>/dev/null; then
                print_success "Conexão com MySQL em $DB_HOST:$DB_PORT OK"
            else
                print_warning "Não foi possível conectar ao MySQL em $DB_HOST:$DB_PORT"
                ((WARNINGS++))
            fi
        else
            print_warning "Comando 'nc' não disponível para testar conexão"
            ((WARNINGS++))
        fi
    fi
fi

# 9. Verificar TypeScript
echo "9️⃣  Verificando TypeScript..."
if [ -f "backend/tsconfig.json" ] && [ -f "frontend/tsconfig.json" ]; then
    print_success "Configurações TypeScript encontradas"
else
    print_error "tsconfig.json não encontrado"
    ((ERRORS++))
fi

# 10. Verificar documentação
echo "🔟 Verificando documentação..."
if [ -f "README.md" ]; then
    print_success "README.md encontrado"
else
    print_warning "README.md não encontrado"
    ((WARNINGS++))
fi

if [ -d "docs" ]; then
    print_success "Pasta docs/ encontrada"
else
    print_warning "Pasta docs/ não encontrada"
    ((WARNINGS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resultado da Validação:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    print_success "Tudo OK! Projeto pronto para uso."
    echo ""
    echo "Para iniciar:"
    echo "  make start"
    echo "  ou"
    echo "  docker-compose up"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    print_warning "$WARNINGS avisos encontrados"
    echo ""
    echo "O projeto pode funcionar, mas verifique os avisos acima."
    exit 0
else
    print_error "$ERRORS erros e $WARNINGS avisos encontrados"
    echo ""
    echo "Corrija os erros antes de continuar."
    exit 1
fi

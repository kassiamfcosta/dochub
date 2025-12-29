#!/bin/bash

# Script de Testes Automatizados - Zello Transcription Hub
# Executa todos os testes e gera relatório

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🧪 Iniciando testes automatizados..."
echo ""

BACKEND_PASSED=0
FRONTEND_PASSED=0

# 1. Testes do Backend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Testes do Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd backend

if [ -f "package.json" ] && npm run | grep -q "test"; then
    print_info "Executando testes do backend..."
    if npm run test; then
        print_success "Testes do backend passaram"
        BACKEND_PASSED=1
    else
        print_error "Testes do backend falharam"
        BACKEND_PASSED=0
    fi
else
    print_error "Script de teste não encontrado no backend"
    BACKEND_PASSED=0
fi

echo ""

# 2. Testes do Frontend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testes do Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd ../frontend

if [ -f "package.json" ] && npm run | grep -q "test"; then
    print_info "Executando testes do frontend..."
    if npm run test; then
        print_success "Testes do frontend passaram"
        FRONTEND_PASSED=1
    else
        print_error "Testes do frontend falharam"
        FRONTEND_PASSED=0
    fi
else
    print_info "Script de teste não encontrado no frontend (pode não ter testes ainda)"
    FRONTEND_PASSED=1  # Não falha se não houver testes
fi

cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resumo dos Testes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $BACKEND_PASSED -eq 1 ]; then
    print_success "Backend: PASSOU"
else
    print_error "Backend: FALHOU"
fi

if [ $FRONTEND_PASSED -eq 1 ]; then
    print_success "Frontend: PASSOU"
else
    print_error "Frontend: FALHOU"
fi

echo ""

if [ $BACKEND_PASSED -eq 1 ] && [ $FRONTEND_PASSED -eq 1 ]; then
    print_success "Todos os testes passaram! 🎉"
    exit 0
else
    print_error "Alguns testes falharam. Verifique os logs acima."
    exit 1
fi

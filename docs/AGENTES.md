# Configuração dos Agentes de IA

Este documento descreve a configuração dos agentes utilizados para gerar Histórias de Usuário, Resumos e Cards.

## Visão Geral

Os agentes são **pré-configurados no servidor** da API. A aplicação apenas envia o contexto e recebe a resposta processada.

---

## Agentes Disponíveis

### 1. Gerador de Histórias de Usuário

**ID:** `692704d81c546166c00f0188`

**Função:** Analista de requisitos experiente que cria histórias de usuário claras, objetivas e diretas ao ponto.

**Formato de Saída:**

1. Nome da História de Usuário
2. História de usuário (Como [tipo de usuário], quero [funcionalidade] para [benefício])
3. Tipo (Feature ou Melhoria)
4. Critérios de aceitação
5. Regras de negócios
6. Permissões e Acessos
7. Requisitos técnicos
8. Regras de interface
9. Campos e Componentes de UI (tabela Markdown)
10. Cenários de teste (BDD)

---

### 2. Gerador de Resumo

**ID:** `692701451c546166c00efdf4`

**Função:** Assistente que cria resumos claros e objetivos de qualquer tipo de conteúdo.

**Formato de Saída:**

1. Do que se trata (2-3 frases sobre o assunto principal)
2. O que foi abordado (lista dos pontos principais)
3. O que foi decidido ou concluído
4. O que precisa ser feito (ações pendentes)
5. Próximos passos

---

### 3. Gerador de Cards

**ID:** `69261314fffadaeffcb2387c`

**Função:** Extrai informações de Histórias de Usuário e formata como cards do Business Map.

**Formato de Saída:**

- **Nome:** Nome do Card
- **Tipo:** Backend / Frontend / Layout / Fullstack
- **Descrição:** Descrição da funcionalidade

---

## Integração com API de Agentes

### Endpoint

```bash
POST {ZELLO_API_URL}/api/v1/agent/execute
```

URL padrão: `https://smartdocs-api-hlg.zello.space`

### Payload de Request

```json
{
  "agent": "ID_DO_AGENTE",
  "context": "conteúdo sanitizado para JSON"
}
```

### Response Esperado

```json
{
  "success": true,
  "message": "Agente executado com sucesso",
  "data": {
    "response": "[conteúdo em Markdown]"
  }
}
```

### Listar Agentes Disponíveis

```bash
GET {ZELLO_API_URL}/api/v1/agent-manager
```

---

## Upload de Contexto via Arquivos

A API suporta o envio de múltiplos arquivos para compor o contexto que será enviado aos agentes.

### Endpoint

```bash
POST /api/files/extract-text
```

**Content-Type:** `multipart/form-data`

**Parâmetros:**

- `files`: Array de arquivos (PDF, DOCX, TXT)

**Limite:** 5 arquivos de até 10MB cada.

**Processamento:**
O conteúdo textual é extraído de cada arquivo e concatenado em uma única string, com separadores indicando o início e fim de cada arquivo. Este texto pode então ser usado como entrada para os agentes.

---

## Sanitização de Contexto

Antes de enviar para a API, o texto é sanitizado para garantir compatibilidade com JSON:

1. **Remoção de Emojis** - Evita quebra do JSON
2. **Normalização de Quebras de Linha** - Converte `\r\n`, `\n`, `\r` para espaço único
3. **Remoção de Espaços Múltiplos** - Compacta espaços repetidos
4. **Remoção de Caracteres de Controle** - Remove caracteres invisíveis problemáticos

O utilitário está em:

```typescript
backend/src/utils/text-sanitizer.ts
```

---

## Configuração de Timeout e Retry

- **Timeout:** 120 segundos (agentes podem processar textos longos)
- **Retry:** Máximo 2 tentativas em caso de falha de rede
- **Backoff:** Exponencial (1s, 2s)

---

## Localização no Código

O serviço de integração está em:

```typescript
backend/src/services/zello-mind/ZelloMindService.ts
```

Variáveis de ambiente:

| Variável | Descrição |
|----------|-----------|
| `ZELLO_API_URL` | URL base da API de Agentes |
| `AGENT_HU_ID` | ID do agente Gerador de HU |
| `AGENT_RESUMO_ID` | ID do agente Gerador de Resumo |
| `AGENT_CARDS_ID` | ID do agente Gerador de Cards |

# Documentação da API REST

## Base URL

```
http://localhost:3001/api
```

## Autenticação

A API utiliza JWT (JSON Web Tokens) para autenticação. O token é enviado via cookie `token` (httpOnly) ou no header `Authorization: Bearer <token>`.

## Endpoints

### Autenticação

#### POST /auth/register

Registra um novo usuário.

**Request Body:**
```json
{
  "email": "usuario@zello.tec.br",
  "password": "senha123",
  "name": "João Silva" // opcional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Usuário registrado. Verifique seu email para o código de confirmação."
}
```

**Erros:**
- `400`: Dados inválidos
- `409`: Email já cadastrado

---

#### POST /auth/verify-email

Verifica código de email e autentica usuário.

**Request Body:**
```json
{
  "email": "usuario@zello.tec.br",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verificado com sucesso",
  "user": {
    "id": 1,
    "email": "usuario@zello.tec.br",
    "name": "João Silva"
  }
}
```

**Erros:**
- `400`: Código inválido ou expirado

---

#### POST /auth/login

Faz login de usuário.

**Request Body:**
```json
{
  "email": "usuario@zello.tec.br",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "user": {
    "id": 1,
    "email": "usuario@zello.tec.br",
    "name": "João Silva"
  }
}
```

**Erros:**
- `400`: Dados inválidos
- `404`: Email ou senha inválidos
- `400`: Email não verificado

---

#### POST /auth/logout

Faz logout de usuário.

**Response (200):**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

---

#### GET /auth/me

Retorna informações do usuário autenticado.

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "usuario@zello.tec.br",
    "name": "João Silva",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastSignedIn": "2024-01-01T00:00:00.000Z"
  }
}
```

**Erros:**
- `401`: Não autenticado

---

### Transcrições

#### GET /transcriptions

Lista todas as transcrições do usuário (incluindo compartilhadas).

**Query Parameters:**
- `search` (opcional): Termo de busca

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "title": "Reunião de Planejamento",
      "description": "Reunião do sprint",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

#### POST /transcriptions

Cria uma nova transcrição.

**Request Body:**
```json
{
  "title": "Reunião de Planejamento",
  "content": "Conteúdo da transcrição...",
  "description": "Reunião do sprint" // opcional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Transcrição criada com sucesso",
  "data": {
    "id": 1,
    "userId": 1,
    "title": "Reunião de Planejamento",
    "content": "Conteúdo da transcrição...",
    "description": "Reunião do sprint",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /transcriptions/:id

Obtém uma transcrição específica.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "title": "Reunião de Planejamento",
    "content": "Conteúdo da transcrição...",
    "description": "Reunião do sprint",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "userStory": {
      "id": 1,
      "content": "# História de Usuário...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "summary": {
      "id": 1,
      "content": "# Resumo...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "isOwner": true
  }
}
```

---

#### PUT /transcriptions/:id

Atualiza uma transcrição (apenas dono).

**Request Body:**
```json
{
  "title": "Novo Título", // opcional
  "content": "Novo conteúdo...", // opcional
  "description": "Nova descrição" // opcional
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Transcrição atualizada com sucesso",
  "data": { ... }
}
```

---

#### DELETE /transcriptions/:id

Deleta uma transcrição (apenas dono).

**Response (200):**
```json
{
  "success": true,
  "message": "Transcrição deletada com sucesso"
}
```

---

### Geração de Conteúdo

#### POST /transcriptions/:id/generate-user-story

Gera História de Usuário para uma transcrição.

**Response (201):**
```json
{
  "success": true,
  "message": "História de Usuário gerada com sucesso",
  "data": {
    "id": 1,
    "transcriptionId": 1,
    "content": "# História de Usuário...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Nota:** Se a HU já existe, retorna a existente sem regenerar.

---

#### POST /transcriptions/:id/generate-summary

Gera Resumo para uma transcrição.

**Response (201):**
```json
{
  "success": true,
  "message": "Resumo gerado com sucesso",
  "data": {
    "id": 1,
    "transcriptionId": 1,
    "content": "# Resumo...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Nota:** Se o resumo já existe, retorna o existente sem regenerar.

---

### Compartilhamento

#### POST /transcriptions/:id/share

Compartilha uma transcrição com outro usuário.

**Request Body:**
```json
{
  "email": "outro.usuario@zello.tec.br"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Transcrição compartilhada com sucesso"
}
```

---

#### GET /transcriptions/:id/shared-users

Lista usuários com quem uma transcrição foi compartilhada.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "email": "outro.usuario@zello.tec.br",
      "name": "Maria Silva",
      "sharedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Códigos de Status HTTP

- `200`: Sucesso
- `201`: Criado com sucesso
- `400`: Requisição inválida
- `401`: Não autenticado
- `403`: Não autorizado
- `404`: Recurso não encontrado
- `409`: Conflito (ex: email já cadastrado)
- `500`: Erro interno do servidor

## Formato de Erro

```json
{
  "success": false,
  "message": "Mensagem de erro descritiva"
}
```


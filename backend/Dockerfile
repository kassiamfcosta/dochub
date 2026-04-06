FROM node:20-alpine

WORKDIR /app

# DATABASE_URL e demais segredos vêm do ambiente em runtime (compose, K8s/cofre).
# backend/.env não entra na imagem (.dockerignore).

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN apk update && npm install \
    && apk add --no-cache curl

COPY . .

# Compilar o código TypeScript
RUN rm -rf dist && npm run build && ls -l dist

# Expor porta
EXPOSE 3001

# Comando padrão (pode ser sobrescrito no docker-compose)
CMD ["npm", "run", "start"]

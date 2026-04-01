FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite embute variáveis no build; padrão para Docker na máquina local
ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL

EXPOSE 5173
EXPOSE 4173

# Dev local; em produção o compose usa build + preview na porta 4173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

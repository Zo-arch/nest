# Estágio 1: Build da aplicação
FROM node:18-alpine AS builder

WORKDIR /app

# Copia apenas os arquivos de dependência primeiro (cache layer)
COPY package*.json ./

# Instala todas as dependências (incluindo as de desenvolvimento para o build)
RUN npm ci

# Copia o restante do código fonte
COPY . .

# Gera a pasta 'dist' (compilação do TypeScript para JS)
RUN npm run build

# Estágio 2: Imagem final de produção
FROM node:18-alpine

WORKDIR /app

# Define ambiente de produção
ENV NODE_ENV=production

# Copia apenas o package.json novamente
COPY package*.json ./

# Instala APENAS dependências de produção (ignora devDependencies)
# Isso deixa a imagem muito mais leve
RUN npm ci --only=production

# Copia o build gerado no estágio anterior
COPY --from=builder /app/dist ./dist

# Expõe a porta da aplicação
EXPOSE 3000

# Comando para iniciar
CMD ["node", "dist/main"]
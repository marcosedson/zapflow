FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package.json pnpm-lock.yaml* ./
COPY apps/bff ./apps/bff
COPY apps/bff/package.json ./apps/bff/
COPY prisma ./prisma

# Instalar dependências
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build TypeScript
WORKDIR /app/apps/bff
RUN pnpm build

# Gerar Prisma Client
RUN pnpm prisma:generate

# Expose port
EXPOSE 3001

# Start server
CMD ["pnpm", "start"]

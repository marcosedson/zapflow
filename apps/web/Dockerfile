FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package.json pnpm-lock.yaml* ./
COPY apps/web ./apps/web

# Instalar dependências
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build Next.js
WORKDIR /app/apps/web
RUN pnpm build

# Expose port
EXPOSE 3000

# Start server
CMD ["pnpm", "start"]

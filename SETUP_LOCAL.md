# 🚀 Setup Local — Guia Completo

## Pré-requisitos

```bash
# Verificar Node.js (v20+)
node --version

# Instalar pnpm se não tiver
npm install -g pnpm

# Verificar Docker
docker --version
docker-compose --version
```

---

## Passo 1: Clone & Install

```bash
cd ~/projetos
git clone https://github.com/marcosedson/zapflow
cd zapflow

# Instalar todas as dependências
pnpm install
```

⏱️ **Tempo:** 2-3 minutos

---

## Passo 2: Configurar .env.local

```bash
# Copiar template
cp .env.example .env.local

# Editar com suas credenciais Firebase
nano .env.local
```

**Mínimo obrigatório:**
```
DATABASE_URL=postgresql://zapflow:zapflow123@localhost:5432/zapflow
REDIS_URL=redis://localhost:6379
FIREBASE_PROJECT_ID=mesalvai-9376e
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

> **Obter Firebase JSON:** Firebase Console → Project Settings → Service Accounts → Generate Private Key

---

## Passo 3: Docker (PostgreSQL + Redis)

```bash
# Subir containers
docker-compose up -d

# Verificar
docker-compose ps

# Logs (opcional)
docker-compose logs -f
```

✅ **Portas:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

---

## Passo 4: Banco de Dados

```bash
# Criar schema + migrar
pnpm db:migrate

# Isso cria todas as tabelas
```

---

## Passo 5: Rodar Desenvolvimento

```bash
# Na raiz do projeto
pnpm dev

# Abre:
# ├─ http://localhost:3001 (BFF)
# └─ http://localhost:3000 (Web)
```

---

## 🎯 URLs & Credenciais

| Serviço | URL | Login |
|---------|-----|-------|
| **Web** | http://localhost:3000/login | teste@example.com / senha123 |
| **API Health** | http://localhost:3001/health | — |
| **Database** | localhost:5432 | zapflow / zapflow123 |
| **Redis** | localhost:6379 | — |

---

## ✅ Verificar Tudo

```bash
# BFF rodando?
curl http://localhost:3001/health
# {"status":"ok","timestamp":"..."}

# Web carrega?
curl http://localhost:3000/

# Database?
docker exec zapflow-postgres psql -U zapflow zapflow -c "SELECT COUNT(*) FROM plans;"
```

---

## 🛠️ Troubleshooting

```bash
# PostgreSQL porta ocupada?
docker-compose down
docker-compose up -d

# Regenerar Prisma Client
pnpm prisma generate

# Reset total
docker-compose down -v
docker-compose up -d
pnpm db:migrate
pnpm dev

# Matar Node se travou
pkill -f "node"
pkill -f "next"
```

---

## 📊 Primeiro acesso

1. Abra **http://localhost:3000/login**
2. Login: `teste@example.com` / `senha123`
3. Vá para **Dashboard** → deve ver stats
4. Navegue: Campanhas → Instâncias → Contatos → Analytics

---

## 🚀 Pronto!

Você tem:
- ✅ Next.js web em http://localhost:3000
- ✅ Express BFF em http://localhost:3001
- ✅ PostgreSQL rodando
- ✅ Redis rodando
- ✅ Hot reload automático

**Comece editando código em `apps/web/app/(dashboard)/page.tsx` e veja as mudanças ao vivo!**

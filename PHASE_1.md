# Phase 1 — Fundação (✅ COMPLETA)

## ✅ Status: ESTRUTURA COMPLETA

### O que foi implementado

#### 1. **Turborepo Workspace**
```
zapflow/
├── apps/
│   ├── bff/        # Node.js + Express + TypeScript
│   └── web/        # Next.js 14
├── packages/
│   └── shared/     # Tipos compartilhados
├── prisma/         # Schema + migrations
└── turbo.json      # Config Turborepo
```

#### 2. **Docker Compose (Produção Local)**
- PostgreSQL 16
- Redis 7
- BFF (Node.js)
- Web (Next.js)
- Health checks automáticos

#### 3. **Banco de Dados — Prisma Schema Completo**
- `Plan` — planos de preço
- `Tenant` — multi-tenant (clientes)
- `Instance` — instâncias WhatsApp por tenant
- `Contact` — contatos com opt-out
- `ContactList` — listas de contatos
- `Campaign` — campanhas de envio
- `CampaignRecipient` — rastreio de envios
- `UsageLog` — logs de uso diário

#### 4. **BFF (Backend)**

**Estrutura:**
```
apps/bff/src/
├── index.ts              # Express app + Prisma init
├── firebase.ts           # Firebase Admin init
├── middleware/
│   └── tenant-auth.ts    # Auth Firebase multi-tenant
└── routes/
    └── admin.ts          # CRUD plans/tenants
```

**Middleware:**
- `requireAuth` — valida token Firebase + carrega tenant
- `requireAdmin` — requer admin (hardcoded para Phase 1)

**Rotas Admin (POST /api/admin/**):**
- `GET /plans` — listar planos
- `POST /plans` — criar plano
- `GET /tenants` — listar tenants
- `POST /tenants` — criar tenant (com planId)
- `PUT /tenants/:id` — atualizar status/plano

#### 5. **Configuração**

**Environment:**
- `.env.example` — template com todas as variáveis
- `docker-compose.yml` — lê .env automaticamente
- Firebase Admin inicializado via `FIREBASE_SERVICE_ACCOUNT_JSON`

**Dependências:**
- Express, TypeScript, Prisma, Firebase Admin, Redis, BullMQ, Axios
- Next.js 14, React 18, Firebase SDK

---

## 🚀 Como Rodar Localmente

```bash
# 1. Instalar dependências
pnpm install

# 2. Copiar .env
cp .env.example .env

# 3. Editar .env com suas credenciais Firebase
nano .env

# 4. Subir Docker
docker-compose up -d

# 5. Rodar migrations
pnpm db:migrate

# 6. Dev mode (ambos em paralelo)
pnpm dev

# BFF: http://localhost:3001/health
# Web: http://localhost:3000
```

---

## 📊 Primeira Requisição Admin

```bash
# 1. Criar plano
curl -X POST http://localhost:3001/api/admin/plans \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Starter",
    "priceMonthly": 9700,
    "dailyLimit": 300,
    "instanceLimit": 1,
    "features": {"audio": false, "document": false}
  }'

# 2. Criar tenant
curl -X POST http://localhost:3001/api/admin/tenants \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUid": "user-123",
    "name": "PME Brasil",
    "email": "contato@pme.com.br",
    "planId": "<plan-id>"
  }'
```

---

## 🎯 Próximos Passos (Phase 2)

- [ ] Rotas de instances (conectar Evolution API)
- [ ] Rotas de contacts (import CSV)
- [ ] Rotas de campanhas
- [ ] BullMQ campaign-worker
- [ ] Smart delay calculator
- [ ] Health score tracking
- [ ] Next.js dashboard (login + tenant pages)

---

## 📚 Arquivos Principais

| Arquivo | Função |
|---------|---------|
| `prisma/schema.prisma` | Schema PostgreSQL multi-tenant |
| `apps/bff/src/firebase.ts` | Inicialização Firebase Admin |
| `apps/bff/src/middleware/tenant-auth.ts` | Auth + multi-tenant |
| `apps/bff/src/routes/admin.ts` | CRUD plans/tenants |
| `docker-compose.yml` | Infra local |
| `.env.example` | Template de variáveis |

---

## ✅ Checklist

- [x] Turborepo setup
- [x] Docker Compose
- [x] Prisma schema (14 models)
- [x] Firebase Admin auth
- [x] Multi-tenant middleware
- [x] Admin CRUD routes
- [x] Environment template
- [x] TypeScript config

**Phase 1 completa! Pronto para Phase 2.** 🚀

# 🚀 Setup para Phase 1

## ✅ Já Feito (Phase 0)

- [x] Repositório GitHub criado: https://github.com/marcosedson/zapflow
- [x] Rastreio de números implementado
- [x] Documentação básica pronta
- [x] `.gitignore` configurado

## 📋 Checklist para Phase 1

### 1. Setup Local
- [ ] Clone o repo: `git clone https://github.com/marcosedson/zapflow`
- [ ] `npm install -g pnpm` (Turborepo)
- [ ] Instalar Docker Desktop

### 2. Estrutura Inicial
```bash
cd zapflow
mkdir -p apps/{bff,web} packages/shared
pnpm init
# Criar Turborepo config
```

### 3. Dependências

**BFF (apps/bff/package.json)**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "typescript": "^5.3.3",
    "@prisma/client": "^5.7.0",
    "redis": "^4.6.12",
    "bullmq": "^5.1.5",
    "firebase-admin": "^12.0.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "tsx": "^4.7.0"
  }
}
```

**Web (apps/web/package.json)**
```json
{
  "dependencies": {
    "next": "14.0.4",
    "react": "^18.2.0",
    "firebase": "^10.7.0",
    "axios": "^1.6.5"
  }
}
```

### 4. PostgreSQL + Redis via Docker

```dockerfile
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: zapflow123
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

### 5. Prisma Schema

```bash
cd apps/bff
npx prisma init
# Editar prisma/schema.prisma com o schema do PLANO
npx prisma migrate dev --name init
```

### 6. Firebase Setup

```bash
# Copiar service account JSON de:
# Firebase Console → Project Settings → Service Accounts → Generate new private key
# Salvar em: apps/bff/.env como FIREBASE_SERVICE_ACCOUNT_JSON
```

### 7. Admin Panel Initial

```typescript
// apps/web/app/admin/tenants/page.tsx
// Form para Marcos criar tenants e planos
```

---

## 🔗 Referências

- Plano Completo: `/docs/PLANO.md` (no `.claude/plans/`)
- Phase 0 Doc: `./PHASE_0.md`
- Evolution API: https://evo.marconlabs.com.br
- Coolify: https://coolify.io

---

## 🎯 Próximo Passo

Quando estiver pronto para Phase 1:

```bash
cd /Users/marcosmarcon/projetos/zapflow
# Seguir checklist acima
```

Marcos está tudo pronto para começar! 🚀

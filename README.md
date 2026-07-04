# 🚀 ZapFlow — WhatsApp Marketing SaaS

SaaS multi-tenant para envio de campanhas de WhatsApp com proteção automática anti-bloqueio, feito com Evolution API.

## 📋 Fases de Desenvolvimento

- [x] **Phase 0** — Rastreio de números já enviados (✅ COMPLETA)
- [ ] **Phase 1** — Fundação (Turborepo, Docker, PostgreSQL, Redis, Firebase Auth)
- [ ] **Phase 2** — Contacts + Instances (Import CSV, conectar instâncias)
- [ ] **Phase 3** — Campanhas de Texto
- [ ] **Phase 4** — Mídia Rica + Anti-Bloqueio
- [ ] **Phase 5** — Analytics + White Label

## 🎯 Posicionamento

**Tagline:** "WhatsApp marketing para PMEs — sem limite de surpresa, com proteção automática anti-bloqueio."

### Planos

| Plano | Preço | Msgs/dia | Instâncias | Recursos |
|-------|-------|----------|------------|----------|
| Starter | R$97/mês | 300 | 1 | Texto, imagem |
| Pro | R$197/mês | 1.000 | 3 | + Áudio, doc, vídeo |
| Business | R$397/mês | 5.000 | 10 | + White label |
| Enterprise | R$797/mês | Ilimitado | 25 | + Acesso API REST |

## 🏗️ Stack

- **Backend**: Node.js 20 + Express + TypeScript
- **Frontend**: Next.js 14 App Router
- **Database**: PostgreSQL 16 + Prisma
- **Cache/Queues**: Redis 7 + BullMQ
- **Auth**: Firebase Auth
- **Infra**: Docker + Coolify (self-hosted no VPS)
- **WhatsApp**: Evolution API (evo.marconlabs.com.br)

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/seu-usuario/zapflow.git
cd zapflow

# Desenvolvimento local
docker-compose up -d
pnpm install
pnpm prisma migrate dev

# Iniciar BFF
cd apps/bff
pnpm dev

# Iniciar Web (outra aba)
cd apps/web
pnpm dev
```

## 📚 Documentação

- 📋 Plano completo: `/docs/PLANO.md` (salvo em `.claude/plans/`)
- 🔄 Phase 0: Rastreio de números (`sent_numbers.json`)

## 🎓 Reaproveitamento do Mesalvai

- `normalizePhone()` — validação de telefone
- `sendWhatsAppText()` — cliente Evolution API
- Auth middleware Firebase

## 📝 Licença

MIT

## 👤 Autor

Marcos — [@marcosmarcon](https://github.com/marcosmarcon)

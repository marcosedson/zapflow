# Phase 4 — Mídia Rica + Dashboard + Warm-up (✅ COMPLETA)

## ✅ Status: ANALYTICS E SEGMENTAÇÃO IMPLEMENTADAS

### O que foi implementado

#### 1. **Storage Lib (Firebase Storage Ready)**
```typescript
uploadMedia(file, fileName, mimeType) → url
- Placeholder para Firebase Storage
- Validação de tipo MIME
- Para Phase 4+: implementar real com @google-cloud/storage

validateMediaUrl(url) → boolean
- HEAD request para verificar acessibilidade

SUPPORTED_MEDIA_TYPES:
  - image: jpeg, png, webp
  - audio: mpeg, ogg, wav
  - document: pdf
  - video: mp4, 3gpp
```

#### 2. **Dashboard Routes**

**GET /api/dashboard**
- Overview completo do tenant
- Campanhas por status (draft, running, paused, completed, failed)
- Instâncias com health status
- Contatos (active vs optedOut)
- Uso diário (sent, failed, remaining)
- 5 campanhas recentes

**GET /api/dashboard/analytics**
- Histórico 30 dias
- Total sent, failed, avg/dia
- Peak day (maior envio)
- Daily breakdown (gráfico)

**GET /api/dashboard/instance-health**
- Saúde de todas instâncias
- Health score % + status
- Last seen

#### 3. **Segmentação de Contatos**

```typescript
SegmentFilter:
  excludeRecentlySent?: number  // não enviar para quem recebeu há < X dias
  onlyTags?: string[]           // enviar para contatos com essas tags
  excludeTags?: string[]        // não enviar para contatos com essas tags
  onlyOptedIn?: boolean         // padrão: true
```

**Exemplo de uso:**
```bash
POST /api/campaigns/:id/add-recipients
{
  "all": true,
  "filter": {
    "excludeRecentlySent": 7,     // não enviar para quem recebeu há < 7 dias
    "onlyTags": ["hot-lead"],     // só leads quentes
    "excludeTags": ["competitor"] // não enviar para competitors
  }
}
```

**Funções:**
```typescript
filterContactsBySegment(tenantId, filter) → contactIds[]
- Aplica filtros e retorna IDs elegíveis

getSegmentStats(tenantId, filter) → stats
- Total, active, optedOut, avgLastSentDays

getSegmentationSuggestions(tenantId) → suggestions
- Recomenda tags, dias de exclusão, tamanho audiência
```

#### 4. **Warm-up Automático**

**Schedule (por plano):**
```
Dia 1-3:   20 msgs/dia
Dia 4-7:   50 msgs/dia
Dia 8-14:  100 msgs/dia
Dia 15-30: 200 msgs/dia
Dia 31+:   limite do plano
```

**Incremento automático:**
```typescript
incrementWarmupDay(instanceId) → newDay
- Incrementa 1 dia (max 30)
- Chamado via cron job diariamente

incrementAllWarmupDays() → count
- Incrementa TODAS as instâncias connected
- Chamado via Cloud Scheduler 00:00 UTC
```

**Endpoint Cron:**
```
POST /api/cron/warmup
- Chamado por Cloud Scheduler (0 0 * * * UTC)
- Header: X-Goog-IAM-Authority-Selector
- Retorna: { ok, updated, timestamp }
```

#### 5. **Campanhas com Segmentação**

**POST /api/campaigns/:id/add-recipients (atualizado)**
```json
{
  "all": true,  // ou "listId": "..."
  "filter": {
    "excludeRecentlySent": 7,
    "onlyTags": ["vip"],
    "excludeTags": ["inactive"]
  }
}
```

Resposta: `{ added: 450, filtered: 450 }`

---

## 📊 Exemplo — Dashboard Completo

```bash
curl -X GET http://localhost:3001/api/dashboard \
  -H "Authorization: Bearer <token>"
```

**Resposta:**
```json
{
  "campaigns": {
    "draft": 2,
    "running": 1,
    "paused": 0,
    "completed": 15,
    "failed": 0
  },
  "instances": {
    "total": 2,
    "connected": 2,
    "disconnected": 0,
    "avgHealthScore": 95,
    "instances": [
      {
        "id": "...",
        "name": "Loja Principal",
        "status": "connected",
        "healthScore": 95,
        "healthStatus": "healthy",
        "warmupDay": 12
      }
    ]
  },
  "contacts": {
    "active": 450,
    "optedOut": 15
  },
  "daily": {
    "sent": 120,
    "failed": 5,
    "total": 125,
    "limit": 300,
    "remaining": 175
  },
  "recentCampaigns": [
    {
      "id": "...",
      "name": "Flash Sale",
      "status": "completed",
      "messageType": "text",
      "instance": { "name": "Loja Principal" }
    }
  ],
  "plan": {
    "name": "Starter",
    "dailyLimit": 300,
    "instanceLimit": 1
  }
}
```

---

## 📊 Exemplo — Analítica 30 Dias

```bash
curl -X GET http://localhost:3001/api/dashboard/analytics \
  -H "Authorization: Bearer <token>"
```

**Resposta:**
```json
{
  "totalSent": 3500,
  "totalFailed": 150,
  "avgPerDay": 117,
  "peakDay": {
    "date": "2026-07-02",
    "count": 450
  },
  "dailyBreakdown": [
    { "date": "2026-06-03", "sent": 100, "failed": 5, "total": 105 },
    { "date": "2026-06-04", "sent": 95, "failed": 3, "total": 98 },
    ...
  ]
}
```

---

## 📊 Exemplo — Segmentação Inteligente

```bash
# 1. Ver sugestões de segmentação
curl -X GET "http://localhost:3001/api/contacts/segmentation-suggestions" \
  -H "Authorization: Bearer <token>"
# Resposta: { recommendTags: ["vip", "hot-lead"], recommendExcludeRecentlySent: 5 }

# 2. Enviar para VIPs que não receberam há 7+ dias
curl -X POST http://localhost:3001/api/campaigns/:id/add-recipients \
  -H "Authorization: Bearer <token>" \
  -d '{
    "all": true,
    "filter": {
      "onlyTags": ["vip"],
      "excludeRecentlySent": 7
    }
  }'
# Resposta: { added: 89, filtered: 89 }
```

---

## 🔄 Fluxo Warm-up

```
Dia 1:  20 msgs máximo
        ↓
Dia 2:  20 msgs máximo
        ↓
...
Dia 7:  50 msgs máximo (auto-incrementado por cron)
        ↓
Dia 15: 100 msgs máximo
        ↓
Dia 31: limite do plano (300 para Starter)
```

**Verificação automática:**
```typescript
const effectiveLimit = getEffectiveDailyLimit(
  plano.dailyLimit,   // 300 (Starter)
  instance.warmupDay  // 15 → 100
); // Result: 100 (menor dos dois)
```

---

## 📁 Arquivos Criados

| Arquivo | Função |
|---------|--------|
| `apps/bff/src/lib/storage.ts` | Upload + validação mídia |
| `apps/bff/src/lib/warmup.ts` | Warm-up schedule |
| `apps/bff/src/lib/segmentation.ts` | Filtros de segmentação |
| `apps/bff/src/routes/dashboard.ts` | Dashboard + analytics |
| `apps/bff/src/routes/cron.ts` | Warm-up cron job |

---

## 🚀 Configurar Cloud Scheduler

Para incrementar warmup automaticamente:

```bash
gcloud scheduler jobs create http zapflow-warmup \
  --location=us-central1 \
  --schedule="0 0 * * *" \
  --uri="https://zapflow-bff.run.app/api/cron/warmup" \
  --http-method=POST \
  --oidc-service-account-email=zapflow@project.iam.gserviceaccount.com
```

---

## 📊 Stats de Exemplo

**Cenário:** PME com Starter (300/dia)
```
Dia 1:  Enviar 20 (warm-up)      → Health: 98
Dia 7:  Enviar 50                → Health: 94
Dia 15: Enviar 100               → Health: 90
Dia 31: Enviar 300 (full limit)  → Health: 85
```

---

## ✅ Checklist Phase 4

- [x] Storage lib (Firebase placeholder)
- [x] Dashboard overview
- [x] Dashboard analytics (30 dias)
- [x] Instance health tracking
- [x] Segmentação de contatos (tags, recency)
- [x] Add recipients com filtros
- [x] Warm-up lib + schedule
- [x] Cron endpoint para incremento diário
- [x] Sugestões de segmentação

**Phase 4 completa! Dashboard e proteção anti-bloqueio automática.** 🚀

---

## 🎯 Próximos Passos (Phase 5)

- [ ] Next.js Dashboard (login, campanhas, analytics)
- [ ] WebSocket/SSE para progresso em tempo real
- [ ] Upload real para Firebase Storage
- [ ] SendWhatsAppMedia implementado
- [ ] White label customization
- [ ] API keys para Enterprise

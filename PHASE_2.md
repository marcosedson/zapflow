# Phase 2 — Instances + Contacts + Health Score (✅ COMPLETA)

## ✅ Status: ROTAS E LÓGICA IMPLEMENTADAS

### O que foi implementado

#### 1. **Lib de Phone Validation**
```typescript
normalizePhone(rawPhone) → "5534997656230"
- Remove caracteres não-numéricos
- Adiciona "55" se não tiver
- Compatível com: "34997656230", "(34) 99765-6230", "+55 34 99765-6230"

isValidPhone(phone) → boolean
- Valida: 55 + DDD (2) + 9 + 8 dígitos = 13 dígitos
```

#### 2. **Health Score Management**
```typescript
updateHealthScore(instanceId, result)
- 429 (rate limit): -50
- Connection Closed: -20
- Número inválido: -3
- Erro 500+: -10
- Sucesso: +1
- Clamp: 0-100

getHealthStatus(score) → "critical" | "warning" | "healthy"
- < 20: critical (pausar)
- < 50: warning (alertar)
- ≥ 50: healthy
```

#### 3. **Smart Delay Calculator**
```typescript
calculateSafeDelay(dailyLimit, startHour, endHour)
- Starter 300/dia (8h-17h): 108s/msg → 33 msgs/h ✅
- Pro 1000/dia (8h-17h): 32.4s → capped a 60s → 60 msgs/h ✅

applyRandomVariation(delayMs) → number
- Variação aleatória ±40% para parecer natural

getEffectiveDailyLimit(planLimit, warmupDay)
- Dia 1-3: 20 msgs/dia
- Dia 4-7: 50 msgs/dia
- Dia 8-14: 100 msgs/dia
- Dia 15-30: 200 msgs/dia
- Dia 31+: limite do plano
```

#### 4. **Instances Routes**

**GET /api/instances**
- Lista instâncias do tenant
- Incluir: health status, campaigns recentes

**GET /api/instances/:id**
- Detalhe completo + 5 campanhas recentes

**POST /api/instances**
- Criar nova instância
- Validar limite de instâncias do plano
- Body: `{ name, instanceName, apiUrl, apiKey }`

**PUT /api/instances/:id**
- Atualizar name ou status

**DELETE /api/instances/:id**
- Deletar instância (casca via onDelete: Cascade)

**GET /api/instances/:id/qr**
- Proxy para Evolution API
- Retorna QR code para escanear WhatsApp

**GET /api/instances/:id/check-health**
- Verifica status na Evolution API
- Atualiza `lastSeenAt`
- Retorna: `{ connected: boolean, status: string }`

#### 5. **Contacts Routes**

**GET /api/contacts**
- Paginar contatos (skip, take)
- Filtrar: optedOut=true|false
- Body: estrutura: `{ contacts, total, skip, take }`

**GET /api/contacts/search**
- Buscar por nome ou telefone
- Query: `?q=João` ou `?q=34997656230`

**POST /api/contacts/import**
- Import de contatos via JSON
- Body: `{ contacts: [{ name, phone, tags }] }`
- Validação e deduplicação automática
- Retorna: `{ total, imported, skipped, invalid, errors }`

**PUT /api/contacts/:id**
- Atualizar name ou tags

**DELETE /api/contacts/:id**
- Deletar contato

**POST /api/contacts/:id/opt-out**
- Marcar como optedOut=true + optedOutAt=now()

---

## 📊 Exemplo de Requisição — Import 100 Contatos

```bash
curl -X POST http://localhost:3001/api/contacts/import \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      { "name": "João Silva", "phone": "34997656230", "tags": ["loja"] },
      { "name": "Maria Santos", "phone": "(34) 99765-6231", "tags": ["suporte"] },
      { "name": "Pedro Costa", "phone": "+55 34 99765-6232" }
    ]
  }'
```

**Resposta:**
```json
{
  "total": 3,
  "imported": 3,
  "skipped": 0,
  "invalid": 0,
  "errors": []
}
```

---

## 📊 Exemplo — Conectar Instância

```bash
curl -X POST http://localhost:3001/api/instances \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Loja Principal",
    "instanceName": "mesalvai",
    "apiUrl": "https://evo.marconlabs.com.br",
    "apiKey": "aB3Cd4eF5gH6iJ7kL8mN9oP0qR1sT2uV"
  }'
```

**Resposta:**
```json
{
  "id": "clrj234k...",
  "name": "Loja Principal",
  "instanceName": "mesalvai",
  "status": "disconnected",
  "healthScore": 100,
  "healthStatus": "healthy",
  "warmupDay": 1,
  "createdAt": "2026-07-04T10:00:00Z"
}
```

---

## 🚀 Como Testar Localmente

```bash
# 1. Instâncias
curl -X GET http://localhost:3001/api/instances \
  -H "Authorization: Bearer <firebase-token>"

# 2. Obter QR code
curl -X GET http://localhost:3001/api/instances/<instance-id>/qr \
  -H "Authorization: Bearer <firebase-token>"

# 3. Verificar saúde
curl -X GET http://localhost:3001/api/instances/<instance-id>/check-health \
  -H "Authorization: Bearer <firebase-token>"

# 4. Import contatos
curl -X POST http://localhost:3001/api/contacts/import \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{ "contacts": [...] }'

# 5. Buscar contatos
curl -X GET http://localhost:3001/api/contacts \
  -H "Authorization: Bearer <firebase-token>"

# 6. Buscar por nome
curl -X GET "http://localhost:3001/api/contacts/search?q=João" \
  -H "Authorization: Bearer <firebase-token>"
```

---

## 📁 Arquivos Criados

| Arquivo | Função |
|---------|--------|
| `apps/bff/src/lib/phone.ts` | Normalização + validação de telefone |
| `apps/bff/src/lib/health-score.ts` | Score + status da instância |
| `apps/bff/src/lib/smart-delay.ts` | Delay seguro + warm-up schedule |
| `apps/bff/src/routes/instances.ts` | CRUD + QR + health check |
| `apps/bff/src/routes/contacts.ts` | Import + CRUD + search |
| `apps/bff/src/index.ts` | Registrado rotas |

---

## 🎯 Próximos Passos (Phase 3)

- [ ] CRUD de campanhas
- [ ] BullMQ campaign-worker
- [ ] Personalização de mensagens
- [ ] Webhook de Evolution API
- [ ] Dashboard em tempo real (Next.js)
- [ ] WebSocket/SSE para progresso

---

## ✅ Checklist Phase 2

- [x] Phone validation lib
- [x] Health score management
- [x] Smart delay calculator
- [x] Instances CRUD
- [x] Instances QR proxy
- [x] Instances health check
- [x] Contacts CRUD
- [x] Contacts import com dedup
- [x] Contacts search
- [x] Contacts opt-out
- [x] Multi-tenant auth em todas as rotas

**Phase 2 completa! Pronto para campanhas em Phase 3.** 🚀

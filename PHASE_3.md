# Phase 3 — Campanhas + BullMQ + Webhook (✅ COMPLETA)

## ✅ Status: CAMPANHAS FUNCIONANDO

### O que foi implementado

#### 1. **WhatsApp Lib (Reusado do Mesalvai)**
```typescript
sendWhatsAppText(apiUrl, instanceName, apiKey, phone, text, delay)
- POST /message/sendText/{instanceName}
- Headers: apikey, Content-Type: application/json
- Body: { number, text, delay }
- Tratamento de erros: 429 (rate limit), Connection Closed, etc

sendWhatsAppMedia(apiUrl, instanceName, apiKey, phone, caption, mediaUrl, type, delay)
- Para Phase 4+: imagem, áudio, documento, vídeo
```

#### 2. **BullMQ Campaign Worker**
```typescript
Processa campanhas em background:
- Carrega 1000 recipients pending por vez
- Valida opt-out antes de enviar
- Personaliza mensagem: {{nome}} → "João"
- Envia via Evolution API
- Atualiza health score da instância
- Incrementa UsageLog diário
- Para em 3x Connection Closed (reconexão)
- Para em 429 (rate limit)
- Aplica delay + variação aleatória ±40%
- Atualiza job progress em tempo real
```

#### 3. **Campaigns Routes**

**GET /api/campaigns**
- Listar campanhas do tenant
- Filtrar por status (draft, scheduled, running, paused, completed, failed)
- Incluir stats (pending, sent, failed, skipped)

**GET /api/campaigns/:id**
- Detalhe com recipients paginados
- Stats por status

**POST /api/campaigns**
- Criar nova campanha (draft)
- Auto-calcular smart delay baseado no plano + warmup
- Body: `{ name, instanceId, messageType, content, mediaUrl? }`

**PUT /api/campaigns/:id**
- Atualizar (só draft)
- Name ou content

**DELETE /api/campaigns/:id**
- Deletar (só draft ou paused)

**POST /api/campaigns/:id/add-recipients**
- Adicionar contatos à campanha
- Body: `{ listId }` ou `{ all: true }`
- Pula optedOut automaticamente

**POST /api/campaigns/:id/start**
- Iniciar envios (muda para running)
- Enfileira job BullMQ
- Retorna job info

**POST /api/campaigns/:id/pause**
- Pausar envios (status → paused)

#### 4. **Plan Limit Middleware**
```typescript
checkPlanLimit(req, res, next)
- Carrega UsageLog de hoje
- Calcula remaining messages
- Adiciona headers:
  - X-Daily-Limit
  - X-Daily-Usage
  - X-Daily-Remaining
- Fail open (continua mesmo com erro)
```

#### 5. **Webhooks Routes**

**POST /api/webhooks/evolution**
- Recebe eventos da Evolution API
- Detecta: "PARAR", "STOP", "SAIR", "CANCELAR", "DESCADASTRAR", "0"
- Marca contato como optedOut=true em TODOS os tenants
- Extrai número e normaliza (55XXXXXXXXXXX)

**POST /api/webhooks/health-check**
- Simples health check para testar webhook

---

## 📊 Exemplo — Criar e Enviar Campanha

```bash
# 1. Criar campanha
curl -X POST http://localhost:3001/api/campaigns \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Flash Sale Março",
    "instanceId": "<instance-id>",
    "messageType": "text",
    "content": "Opa {{nome}}! 🎉 Flash sale começou! Confira: mesalvai.com.br"
  }'
# Resposta: { id: "clrj234...", delayMs: 108000, status: "draft" }

# 2. Adicionar todos os contatos
curl -X POST http://localhost:3001/api/campaigns/<campaign-id>/add-recipients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "all": true }'
# Resposta: { added: 450 }

# 3. Iniciar envios
curl -X POST http://localhost:3001/api/campaigns/<campaign-id>/start \
  -H "Authorization: Bearer <token>"
# Resposta: { campaign: { status: "running", ... }, job: { id: "..." } }

# 4. Verificar progresso (em tempo real)
curl -X GET http://localhost:3001/api/campaigns/<campaign-id> \
  -H "Authorization: Bearer <token>"
# Resposta: { stats: { pending: 250, sent: 150, failed: 50 } }

# 5. Pausar se necessário
curl -X POST http://localhost:3001/api/campaigns/<campaign-id>/pause \
  -H "Authorization: Bearer <token>"
```

---

## 🔄 Fluxo de Envio

```
1. POST /campaigns/:id/start
   ↓
2. Status muda para "running"
   ↓
3. Job enfileirado em BullMQ
   ↓
4. Worker processa:
   a. Carrega 1000 recipients pending
   b. Para cada um:
      - Valida opt-out
      - Personaliza mensagem
      - Envia via Evolution API
      - Atualiza health score
      - Incrementa UsageLog
      - Aplica delay + variação
   ↓
5. Quando sem mais pending:
   Status muda para "completed"
   completedAt = agora
```

---

## ⚠️ Lógicas Importantes

### Health Score Updates
```
429 (rate limit):       -50 → pausar campanha
Connection Closed:      -20 (3x seguidos → pausar)
Número inválido:        -3
Erro 500+:              -10
Sucesso:                +1
```

### Daily Limit Enforcement
```
- UsageLog por tenant por dia
- Se atingiu plano limit → pausar campanha
- Verificação em tempo real no worker
```

### Personalização
```
Content: "Opa {{nome}}! Confira..."
Contato: { name: "João Silva", phone: "..." }
Resultado: "Opa João! Confira..."
```

### Opt-Out Automático
```
Cliente responde: "PARAR", "STOP", etc
Webhook recebe mensagem
Marca contact.optedOut = true
Próxima campanha pula esse contato
```

---

## 📁 Arquivos Criados

| Arquivo | Função |
|---------|--------|
| `apps/bff/src/lib/whatsapp.ts` | SendText + SendMedia |
| `apps/bff/src/queue/campaign-worker.ts` | BullMQ processor |
| `apps/bff/src/routes/campaigns.ts` | CRUD + start/pause |
| `apps/bff/src/routes/webhooks.ts` | Evolution webhook |
| `apps/bff/src/middleware/plan-limit.ts` | Daily limit check |

---

## 🚀 Testar Localmente

```bash
# 1. Verificar saúde do worker
docker logs zapflow-bff

# 2. Criar instância + contatos (Phase 2)
# ... (use endpoints do Phase 2)

# 3. Criar campanha
curl -X POST http://localhost:3001/api/campaigns ...

# 4. Adicionar recipients
curl -X POST http://localhost:3001/api/campaigns/:id/add-recipients \
  -d '{ "all": true }'

# 5. Iniciar
curl -X POST http://localhost:3001/api/campaigns/:id/start

# 6. Verificar em tempo real
curl -X GET http://localhost:3001/api/campaigns/:id

# 7. Pausar se necessário
curl -X POST http://localhost:3001/api/campaigns/:id/pause
```

---

## 🎯 Próximos Passos (Phase 4)

- [ ] Upload de mídia (Firebase Storage)
- [ ] SendWhatsAppMedia integration
- [ ] Dashboard em tempo real (WebSocket/SSE)
- [ ] Envio agendado (schedule campaigns)
- [ ] Next.js frontend

---

## ✅ Checklist Phase 3

- [x] WhatsApp client (text + media ready)
- [x] BullMQ campaign worker
- [x] Campaigns CRUD
- [x] Add recipients (all ou por lista)
- [x] Start/pause campaigns
- [x] Personalização de mensagens
- [x] Health score updates
- [x] Daily limit enforcement
- [x] Plan limit middleware
- [x] Evolution webhook (opt-out)
- [x] Job progress tracking
- [x] Exponential backoff on errors

**Phase 3 completa! Campanhas rodando em background com proteção anti-bloqueio.** 🚀

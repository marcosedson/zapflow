# Phase 0 — Rastreio de Números Já Enviados

## ✅ Status: COMPLETA

### O que foi implementado

Adicionado ao script `whatsapp_sender.py` (localizado em `../mesalvai/`):

#### 1. **Arquivo `sent_numbers.json`**
- Rastreia todos os números para os quais mensagens foram enviadas
- Persistido em disco (JSON formatado)
- Carregado a cada execução do script

#### 2. **Funções de Rastreio**

```python
def load_sent_numbers(self) -> Set[str]
    # Carrega números já enviados do arquivo
    # Retorna: set de números (55XXXXXXXXXXX)

def save_sent_number(self, phone: str)
    # Marca um número como já enviado
    # Grava em sent_numbers.json
```

#### 3. **Integração no Envio**

**No início do lote:**
```python
sent_numbers = self.load_sent_numbers()
```

**Para cada contato:**
```python
if contact.phone in sent_numbers:
    print(f"  ⏭️  JÁ ENVIADO")
    results["skipped"] += 1
    continue
```

**Após envio (sucesso ou falha):**
```python
self.save_sent_number(contact.phone)
```

### Por que assim?

- ✅ Marcar como enviado **mesmo em caso de falha** previne retentativas infinitas
- ✅ Arquivo JSON simples, sem banco de dados necessário
- ✅ Tolerante a falhas: se o script cai, números já gravados não são repetidos
- ✅ Fácil de debugar: `cat sent_numbers.json`
- ✅ Pronto para migrar para PostgreSQL (Phase 1)

### Como usar

```bash
# Primeira execução (sem números anteriores)
python3 whatsapp_sender.py
# Envia 100 números, gera sent_numbers.json

# Segunda execução (com números anteriores)
python3 whatsapp_sender.py
# Lê sent_numbers.json, pula os 100 anteriores
# Se forneceu 200 contatos, envia só os 100 novos

# Ver números já enviados
cat sent_numbers.json
```

### Próximas Phases

**Phase 1** migrará esse rastreio para PostgreSQL com campos richer:
- Timestamp de envio
- Status (sent/failed/opted_out)
- Erro (se houver)
- Tenant (multi-tenant)

Mas por enquanto, `sent_numbers.json` é **suficiente e seguro** para a operação diária.

---

## 🎯 Resultado

✅ Você pode rodar o script múltiplas vezes e **nunca duplicará envios**  
✅ Se cair no meio, **retoma do ponto correto**  
✅ Números com falha também são marcados para não retentar  
✅ Tudo pronto para migrar para SaaS em Phase 1

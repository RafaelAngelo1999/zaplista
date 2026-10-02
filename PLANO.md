# Lista de Compras — Plano de Construção

App web que transforma a bagunça do WhatsApp em uma lista de supermercado
organizada por corredor, com check, quantidade, preço opcional e histórico local.

> **Status:** Fases 0, 1 e 2 implementadas (menos o service worker). Fase 3
> (compartilhamento) tem o SQL pronto em [SUPABASE.md](SUPABASE.md), sem código
> ainda. Rode com `npm run dev`.

---

## 1. Entendimento do fluxo

```
WhatsApp                App                      IA (por fora)              App
--------                ---                      -------------              ---
"2kg tomate,     →  cola o texto cru     →   cola o prompt       →   cola o JSON
 leite, ptt,         em "Nova lista"          no ChatGPT/Claude       no campo de import
 detergente"         e clica COPIAR           e copia o JSON          → lista pronta
                     PROMPT (já com
                     a lista embutida)
```

Decisão de produto importante: **o app monta o prompt já com a sua lista dentro**.
Você não cola duas coisas em lugares diferentes — copia um bloco só, joga na IA,
traz o JSON de volta. Um atrito a menos por compra.

---

## 2. Stack escolhida (e por quê)

| Camada | Escolha | Motivo |
|---|---|---|
| Build | **Vite 7** | O app é 100% client-side na Fase 1. Vite dá dev server instantâneo e build estático. |
| UI | **React 19 + TypeScript** | Tipagem é o que segura o modelo de dados e o parser do JSON da IA. |
| Estilo | **Tailwind CSS v4** | Tokens via `@theme` no CSS, sem arquivo de config — casa com o design system do §8. |
| Componentes | **Radix UI primitives** (headless) | Acessibilidade de teclado/foco pronta, zero estilo imposto. O visual é 100% nosso. |
| Estado | **Zustand + middleware `persist`** | Store simples, persistência em localStorage de graça, migração versionada. |
| Validação | **Zod** | Valida e *conserta* o JSON da IA (coerce, fallback, default) na mesma passada. |
| Ícones | **Lucide React** | Traço fino de 1.5px, combina com a estética de banco. |
| Roteamento | **React Router 7** | 5 telas, sem necessidade de server. |
| PWA | **vite-plugin-pwa** | Service worker e manifest gerados no build. |
| Fase 3 | **Supabase** (Postgres + Realtime) | Tempo real sem escrever backend; só client SDK. Ver §7. |

**Sem backend próprio, em nenhuma fase.** Fase 1–2 roda só no navegador; a Fase 3
fala direto com o Supabase pelo SDK. Deploy é pasta estática (Vercel/Netlify/Cloudflare Pages).

> Alternativa considerada: Next.js. Rejeitada porque não há nada para renderizar
> no servidor nem rota de API — seria runtime de servidor pago para servir HTML
> estático. Se um dia quiser SEO ou cron job, a migração é direta.

---

## 3. Taxonomia canônica (a peça que faz tudo funcionar)

Se a IA inventar categoria livre, cada import vem com nomes diferentes
("Frios" / "Frios e Laticinios" / "Geladeira") e a ordenação quebra.
Então o app define um **enum fixo** e o prompt obriga a IA a escolher dele.

### Corredores (`aisle` + `aisleOrder`)
A ordem numérica **é a ordem de caminhada** num supermercado típico brasileiro.
Ordenar por corredor = fazer uma volta só na loja.

| # | Corredor |
|---|---|
| 1 | Hortifruti |
| 2 | Padaria |
| 3 | Frios e Laticínios |
| 4 | Carnes e Peixes |
| 5 | Congelados |
| 6 | Mercearia Salgada |
| 7 | Mercearia Doce |
| 8 | Matinais |
| 9 | Bebidas |
| 10 | Limpeza |
| 11 | Higiene e Beleza |
| 12 | Bebê |
| 13 | Pet |
| 14 | Utilidades e Bazar |
| 15 | Farmácia |
| 99 | Outros |

> Evolução: deixar você **reordenar os corredores** e salvar por mercado
> (num Assaí a bebida vem antes da limpeza). Fica em Configurações, Fase 4.

### Tipo (`category`)
Mais granular, para agrupar por natureza do produto e alimentar os insights:
`Frutas`, `Legumes`, `Verduras`, `Carnes vermelhas`, `Aves`, `Peixes`,
`Leite e derivados`, `Queijos e embutidos`, `Pães`, `Grãos e cereais`,
`Massas`, `Molhos e conservas`, `Óleos e temperos`, `Biscoitos e snacks`,
`Doces e sobremesas`, `Café e chá`, `Bebidas não alcoólicas`,
`Bebidas alcoólicas`, `Limpeza de casa`, `Limpeza de roupas`,
`Higiene pessoal`, `Beleza`, `Papelaria e utilidades`, `Descartáveis`,
`Pet`, `Bebê`, `Medicamentos`, `Outros`.

Os dois enums vivem em **um único arquivo** (`src/lib/taxonomy.ts`) que alimenta
ao mesmo tempo o schema Zod, a UI e o texto do prompt. Nada é duplicado à mão.

---

## 4. Modelo de dados

```ts
type Unit = 'un' | 'kg' | 'g' | 'l' | 'ml' | 'pct' | 'cx' | 'dz' | 'bdj' | 'fd';

type Item = {
  id: string;
  name: string;               // "Leite integral Itambé 1L"
  rawText?: string;           // trecho original do WhatsApp (auditoria)
  qty: number;
  unit: Unit;
  qtyAssumed: boolean;        // true = a IA chutou "1 un"
  aisle: string;              // enum de corredor
  aisleOrder: number;
  category: string;           // enum de tipo
  notes?: string;             // "o mais barato", "se tiver promoção"
  checked: boolean;
  checkedAt?: string;
  checkedBy?: string;         // Fase 3
  price?: number;             // preço unitário digitado no mercado
  needsReview?: boolean;      // confiança baixa da IA → destaca em âmbar
  createdAt: string;
  updatedAt: string;
};

type ShoppingList = {
  id: string;
  title: string;              // "Compra do mês — Out/2026"
  market?: string;
  budget?: number;
  status: 'ativa' | 'concluida' | 'arquivada';
  items: Item[];
  createdAt: string;
  updatedAt: string;
  shareCode?: string;         // Fase 3
};

type CatalogEntry = {         // dicionário aprendido, ver §6.1
  key: string;                // nome normalizado: "leite integral"
  aisle: string;
  aisleOrder: number;
  category: string;
  unit: Unit;
  lastPrice?: number;
  lastPriceAt?: string;
  timesBought: number;
};
```

Persistência: **Zustand + `persist`** no localStorage, namespace `compras:v1`,
com stores separados (`lists`, `catalog`, `settings`) e `migrate` por versão.

---

## 5. Telas

1. **Lista ativa** (`/`) — o coração. Agrupada, com check, quantidade, preço.
2. **Importar** (`/importar`) — 3 passos: colar texto cru → copiar prompt → colar JSON.
3. **Histórico** (`/historico`) — listas anteriores, duplicar ("comprar de novo"), itens frequentes.
4. **Insights** (`/insights`) — gasto por mês/categoria, preço médio por item. Fase 4.
5. **Configurações** (`/config`) — tema, backup/export, ordem dos corredores, limpar dados.

### Comportamento da lista ativa (o que você pediu, detalhado)

- **Ordenação** via segmented control: `Corredor` · `Tipo` · `A–Z`.
  Em Corredor/Tipo, cabeçalho sticky com contador `3/7`.
- **Não finalizados primeiro, sempre.** Itens marcados caem para o fim do
  grupo, riscados e esmaecidos; abaixo de tudo, seção colapsável
  `Concluídos (12)`. A reordenação anima em ~180ms (não teleporta o item).
- **Quantidade**: pill editável à esquerda do nome (`2 kg`), com stepper `−/+`
  grande para o dedo. Se `qtyAssumed`, a pill fica cinza — sinal de "a IA chutou isso".
- **Checkbox**: alvo de toque de 44px no mínimo; toque em qualquer ponto da linha
  marca. `navigator.vibrate(10)` no mobile.
- **Undo**: toast "Item removido · Desfazer" por 5s.
- **Busca** incremental + filtro rápido "só o que falta".

---

## 6. O prompt (acesso fácil, como você pediu)

- Fonte: `src/lib/prompt.ts` — template com a taxonomia **injetada a partir do
  enum**, então mudar o enum muda o prompt automaticamente.
- Na tela `/importar`: textarea do texto cru + botão grande **"Copiar prompt com
  a minha lista"** (com confirmação "Copiado ✓") + um `<details>` "ver o prompt"
  para inspecionar. Botão secundário: **"Copiar prompt vazio"**.
- O prompt completo e pronto para uso já está em [prompt-ia.md](prompt-ia.md) —
  dá para usar hoje, antes de existir uma linha de código.

### Import tolerante (importa de verdade, não só no caso feliz)

1. Remove cercas de markdown e texto conversado em volta (varre do primeiro `{`
   ou `[` até o fecho balanceado).
2. Aceita `{ "items": [...] }` **ou** array solto.
3. Valida com Zod: `aisle` desconhecido → `Outros`; `unit` desconhecida → `un`;
   `qty` como string → coerce; `"meio"` → `0.5`.
4. **Preview antes de aplicar**: "18 itens · 2 precisam de revisão · 3 já estão
   na lista", e você escolhe `Substituir` / `Mesclar` / `Criar nova lista`.
5. Em Mesclar, nomes normalizados iguais somam quantidade (unidades diferentes
   ficam separadas).
6. JSON inválido mostra linha/coluna e oferece "tentar consertar" (vírgula
   sobrando, `'` por `"`, chave sem quotes) — a IA erra exatamente isso.

---

## 7. Melhorias que eu proponho

Em ordem de retorno sobre esforço:

**1. Índice de histórico por produto.**
Toda compra encerrada alimenta um índice local `nome normalizado → {vezes
comprado, última compra, preços}`. Ele **não categoriza nada** — a análise é
trabalho da IA no import. Serve para: (a) o dashboard; (b) a comparação de preço
com a última compra; (c) autocomplete ao adicionar item à mão.

**2. Preço (opcional).** Desligado por padrão: o fluxo principal é só marcar o
item. Ligado em Ajustes, aparece um campo de preço por item, o total da compra e
a comparação com a última vez — e é o que alimenta os gráficos do dashboard.

**3. Comparação com a última compra.** Do catálogo: "Leite — R$ 5,49 na vez
passada", com seta vermelha se subiu. Nenhum app de lista faz isso bem, e é o
motivo de você abrir esse em vez do bloco de notas.

**4. Modo mercado.** Um toque: fonte maior, contraste alto, só a lista na tela,
`Screen Wake Lock API` para a tela não apagar, rodapé fixo com o total.

**5. PWA offline.** Instala na home screen e funciona sem sinal — corredor de
supermercado é buraco de 4G. Os dados já são locais, então é quase de graça.

**6. Adicionar item à mão.** Para o que você lembrou no corredor: descrição,
stepper de quantidade e dois `<select>` da taxonomia. **Sem parser de texto
livre** — interpretar linguagem natural é trabalho da IA no import, e duas
engenhocas fazendo a mesma coisa divergem. O histórico preenche corredor e tipo
sozinho quando o produto já é conhecido.

**7. Exportar de volta para o WhatsApp.** "Copiar como texto" gerando a lista
agrupada e legível — para mandar no grupo ou para quem ficou em casa.

**8. Ditar item por voz** (`Web Speech API`, pt-BR). Mão no carrinho, fala o item.

**9. Itens frequentes e templates.** Do histórico: "arroz em 8 das últimas 9
compras" → chip de um toque. E template "Compra do mês".

**10. Backup/export JSON.** É o que elimina o único risco sério da Fase 1
(localStorage apagado). Dois botões: "Baixar backup" e "Restaurar".

**11. Dark mode**, seguindo o sistema, com toggle. Combina com a estética bancária.

**12. Fila de revisão.** Itens `needsReview` entram com borda âmbar e um
"confirmar" — você revisa 2 itens em vez de desconfiar dos 20.

Deliberadamente **fora** do escopo: integração real com a API do WhatsApp
(Business API exige número dedicado, aprovação da Meta e custo por conversa —
copiar/colar resolve 100% do seu caso com 0% da burocracia).

---

## 8. Respostas diretas às suas duas perguntas

### "Histórico com cache local, é possível?"

**Sim, e é o caminho certo para a Fase 1.** localStorage dá ~5MB por origem e
uma lista de 40 itens ocupa ~8KB — cabem centenas de compras com folga. Uso o
middleware `persist` do Zustand, que serializa sozinho, tem `version` + `migrate`
para quando o modelo mudar, e `partialize` para não salvar estado de UI.

Se um dia o histórico crescer muito ou você quiser guardar foto de cupom, troco
só o *storage adapter* para IndexedDB (`idb-keyval`) — a interface do store não
muda, nenhum componente é tocado.

Ressalva honesta: dado local é dado de **um navegador só**, e "limpar dados do
site" apaga tudo. Por isso o backup/export entra já na Fase 2, e a Fase 3
resolve de vez ao colocar na nuvem.

### "Sessão compartilhada entre 2 pessoas, em tempo real, do jeito mais simples?"

**Sim. Supabase**, que dá Postgres + Realtime no free tier e é acessado só pelo
SDK no navegador — você não escreve nem hospeda backend.

```sql
create table lists (
  id uuid primary key default gen_random_uuid(),
  share_code text unique not null,   -- 6 chars, ex: "K7P2QM"
  title text,
  items jsonb not null default '[]',
  revision int not null default 0,
  updated_at timestamptz default now()
);
```

- **Sem login.** O `share_code` é a credencial: quem tem o código entra. Você
  manda o link pelo próprio WhatsApp.
- RLS ligada e o papel `anon` **sem** acesso direto à tabela. Todo acesso passa
  por duas funções `security definer`: `list_get(code)` e
  `list_apply(code, ops, base_revision)`. Assim ninguém varre a tabela com a anon key.
- **Realtime**: via **Broadcast** em canal público `list:<uuid>`, não
  `postgres_changes` — este último respeita o RLS de quem escuta e exigiria uma
  policy `using (true)`, o que abriria todas as listas para qualquer um com a
  anon key. Detalhe e SQL completo em [SUPABASE.md](SUPABASE.md).
- **Conflito** (os dois marcando ao mesmo tempo): não envio a lista inteira,
  envio **operações** (`{ type:'check', itemId, value, at }`). O merge é
  last-write-wins **por item**, comparando `updatedAt`. Para 2 pessoas isso
  basta e cabe em ~80 linhas — não precisa de CRDT.
- **Offline**: continua gravando no localStorage e enfileira as ops; ao
  reconectar, descarrega a fila. O app nunca travaa no corredor sem sinal.
- UI: botão "Compartilhar" → código + link + QR. Iniciais de quem marcou cada
  item e "Maria marcou agora".

Alternativas que considerei: **Firebase RTDB** resolve igual, mas não é mais
simples. **Yjs + y-webrtc** dispensa banco, porém exige os dois online no mesmo
instante e ainda precisa de um signaling server — mais complexo, não menos.

---

## 9. Design system — "fintech de banco"

Estética: superfície calma, hierarquia por **peso e espaço** (não por cor), uma
única cor de acento, e números com presença de extrato bancário.

### Tokens (Tailwind v4, `@theme` em `globals.css`)

```css
@theme {
  /* neutros — a base */
  --color-bg:         oklch(99% 0 0);
  --color-surface:    oklch(100% 0 0);
  --color-surface-2:  oklch(97% 0.003 250);
  --color-border:     oklch(92% 0.004 250);
  --color-text:       oklch(22% 0.010 250);
  --color-text-muted: oklch(55% 0.015 250);

  /* acento único */
  --color-accent:      oklch(58% 0.14 160);   /* verde esmeralda */
  --color-accent-fg:   oklch(99% 0 0);
  --color-accent-soft: oklch(95% 0.04 160);

  /* semânticos */
  --color-success: oklch(60% 0.14 150);
  --color-warning: oklch(78% 0.13  80);
  --color-danger:  oklch(58% 0.19  25);

  /* forma */
  --radius-card:    16px;
  --radius-control: 12px;
  --shadow-card: 0 1px 2px oklch(0% 0 0 / .04), 0 8px 24px oklch(0% 0 0 / .06);

  --font-sans: 'Inter Variable', system-ui, sans-serif;
}
```

Dark mode redefine os mesmos tokens sob `@media (prefers-color-scheme: dark)`
com guarda `:root:not([data-theme="light"])`, e também sob `:root[data-theme="dark"]`
para o toggle manual.

### Regras não negociáveis

- **`font-variant-numeric: tabular-nums` em todo valor e quantidade.** É o
  detalhe que faz parecer banco: os dígitos não dançam quando o total muda.
- Dinheiro sempre alinhado à direita, `R$` menor e em `text-muted`, centavos em
  peso menor. **Um acento por tela**, no máximo.
- Escala de espaço de 4px. Linha de item com 56px de altura (confortável para o dedo).
- Transições de 150–200ms, `ease-out`. Nada de bounce, nada de gradiente colorido.
- Hierarquia pelo peso: 600 em valores e títulos, 400 no corpo, 500 em labels
  `text-muted` 13px uppercase com `tracking-wide`.

### Componentes a construir

`AmountDisplay` · `StatTile` (total / itens / orçamento) · `BudgetBar` ·
`ItemRow` (checkbox + nome + pill de qty + preço à direita) ·
`AisleHeader` (sticky, com contador) · `SegmentedControl` (ordenação) ·
`QtyStepper` · `Chip` · `BottomSheet` (editar item) · `FAB` · `Toast` (com undo) ·
`EmptyState` · `Skeleton`.

Construídos sobre primitivos Radix (Checkbox, Dialog, Popover, Toast,
ToggleGroup) — acessibilidade pronta, visual inteiramente nosso.

---

## 10. Estrutura de pastas

```
compras/
├── index.html
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── routes.tsx
│   ├── styles/globals.css        # @theme + tokens
│   ├── pages/
│   │   ├── ListaAtiva.tsx
│   │   ├── Importar.tsx
│   │   ├── Historico.tsx
│   │   ├── Insights.tsx
│   │   └── Config.tsx
│   ├── components/
│   │   ├── ui/                   # AmountDisplay, SegmentedControl, Toast...
│   │   ├── list/                 # ItemRow, AisleHeader, QtyStepper, BudgetBar
│   │   └── import/               # PromptBox, JsonPaste, ImportPreview
│   ├── lib/
│   │   ├── taxonomy.ts           # fonte única: corredores + tipos
│   │   ├── prompt.ts             # template gerado da taxonomy
│   │   ├── schema.ts             # Zod do JSON importado
│   │   ├── parse.ts              # extrai JSON sujo + parser de texto livre
│   │   ├── merge.ts              # mesclar import na lista
│   │   ├── sort.ts               # ordenações + "não-checados primeiro"
│   │   ├── catalog.ts            # dicionário aprendido
│   │   └── format.ts             # moeda, quantidade, normalização
│   ├── store/
│   │   ├── lists.ts              # zustand + persist
│   │   ├── catalog.ts
│   │   └── settings.ts
│   └── types/index.ts
├── public/                       # manifest.json, ícones
└── PLANO.md / prompt-ia.md
```

---

## 11. Fases de entrega

**Fase 0 — Setup (~30 min)**
Vite + React + TS, Tailwind v4 com os tokens do §9, Radix, Zustand, Zod,
React Router, Lucide. Shell do app com nav inferior e dark mode funcionando.

**Fase 1 — MVP utilizável (exatamente o que você pediu)**
`taxonomy` → `prompt` → tela de importar (copiar prompt / colar JSON / preview)
→ lista agrupada com ordenação (corredor / tipo / A–Z), check com não-feitos
primeiro, quantidade editável → persistência local.
*No fim da Fase 1 você já vai ao mercado com ele.*

**Fase 2 — O que faz voltar a usar** *(entregue junto da Fase 1)*
Histórico e duplicar lista · índice de histórico por produto · preço opcional ·
**dashboard** com evolução mensal, distribuição por corredor e série de preço ·
modo mercado · adicionar à mão · export para WhatsApp · backup JSON.
Fica para depois: PWA offline (service worker).

**Fase 3 — Compartilhamento em tempo real**
Supabase (tabela + RPCs + Realtime), código / link / QR, merge por operações,
fila offline, autoria do check.

**Fase 4 — Extras**
PWA offline · voz · recorrentes e templates · ordem de corredor customizada por
mercado.

---

## 12. Riscos e tratamento

| Risco | Tratamento |
|---|---|
| IA devolve JSON com texto em volta ou inválido | parser tolerante + autofix + erro com posição (§6) |
| IA inventa corredor fora do enum | Zod faz fallback para `Outros` e marca `needsReview` |
| IA categoriza o mesmo produto diferente a cada import | catálogo aprendido sobrescreve a IA (§7.1) |
| localStorage apagado → perde histórico | backup/export na Fase 2; nuvem na Fase 3 |
| Sem sinal no mercado | PWA offline-first; dados já são locais |
| Conflito de edição entre 2 pessoas | ops + LWW por item via `updatedAt` (§8) |
| `share_code` adivinhado | 6 chars sem caracteres ambíguos + rate limit na RPC; nenhum dado sensível na lista |

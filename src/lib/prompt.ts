import { AISLES, CATEGORIES, UNIT_NAMES, UNITS } from '@/lib/taxonomy';
import type { Unit } from '@/types';

const PLACEHOLDER = '{{LISTA}}';

function aisleTable(): string {
  return AISLES.map((a) => `${String(a.order).padEnd(2)} | ${a.name}`).join('\n');
}

function unitLegend(): string {
  const legend = UNITS.filter((u) => u !== 'un' && u !== 'kg' && u !== 'g' && u !== 'l' && u !== 'ml')
    .map((u: Unit) => `${u} = ${UNIT_NAMES[u]}`)
    .join(', ');
  return `${UNITS.join(', ')}\n   (${legend})`;
}

export const PROMPT_TEMPLATE = `Você é um assistente de organização de compras de supermercado no Brasil.

TAREFA
Converter a lista bruta abaixo (copiada de uma conversa de WhatsApp) em JSON estruturado.

REGRAS DE SAÍDA
1. Responda APENAS com o JSON. Sem explicação, sem comentários, sem cercas de markdown.
2. Um objeto por produto. Se uma linha tiver vários ("arroz, feijão e óleo"), gere um item para cada.
3. Ignore o que não é item: saudações, "ok", "vou comprar", horários, nomes de quem mandou, emojis soltos, risadas.

REGRAS DE CONTEÚDO
4. "name": descrição limpa e capitalizada, SEM a quantidade dentro. Expanda abreviação
   do dia a dia (ptt -> "Papel toalha", pq -> "Papel higiênico", sb -> "Sabão",
   det -> "Detergente", amac -> "Amaciante"). Mantenha a marca quando citada
   ("Leite Itambé") e o tamanho quando citado ("Coca-Cola 2L").
5. "qty" e "unit": extraia quando houver.
   "2kg tomate"              -> qty 2, unit "kg"
   "3 leite"                 -> qty 3, unit "un"
   "meio quilo de queijo"    -> qty 0.5, unit "kg"
   "uma dúzia de ovos"       -> qty 1, unit "dz"
   "500ml de creme de leite" -> qty 500, unit "ml"
   Sem quantidade na mensagem -> qty 1, unit "un", e "qtyAssumed": true.
   Caso contrário, "qtyAssumed": false.
6. Unidades permitidas (use exatamente estas siglas): ${unitLegend()}
7. "aisle" e "aisleOrder": escolha EXATAMENTE UM par da tabela de corredores abaixo,
   copiando o número e o nome sem alterar nada.
8. "category": o tipo do produto, mais específico. Escolha da lista de tipos abaixo.
9. "notes": só se a mensagem trouxer instrução relevante — "o mais barato", "da marca X",
   "se tiver promoção", "verde", "sem lactose". Senão, omita o campo.
10. Duplicados: una itens iguais somando a quantidade. Se as unidades divergirem
    (2 un de leite e 1 l de leite), mantenha separados.
11. "confidence": 0 a 1, o quanto você tem certeza da categorização.
    Se for menor que 0.7, inclua também "needsReview": true.
12. "rawText": o trecho original da mensagem que gerou o item.

TABELA DE CORREDORES (aisleOrder | aisle) — na ordem de caminhada da loja
${aisleTable()}

TIPOS PERMITIDOS (category)
${CATEGORIES.join(', ')}

FORMATO EXATO DA RESPOSTA
{
  "version": 1,
  "title": "Compra do mês",
  "items": [
    {
      "name": "Tomate",
      "rawText": "2kg de tomate",
      "qty": 2,
      "unit": "kg",
      "qtyAssumed": false,
      "aisle": "Hortifruti",
      "aisleOrder": 1,
      "category": "Legumes",
      "confidence": 0.98
    },
    {
      "name": "Papel toalha",
      "rawText": "ptt o mais barato",
      "qty": 1,
      "unit": "un",
      "qtyAssumed": true,
      "aisle": "Utilidades e Bazar",
      "aisleOrder": 14,
      "category": "Descartáveis",
      "notes": "o mais barato",
      "confidence": 0.72
    }
  ]
}

LISTA BRUTA
"""
${PLACEHOLDER}
"""`;

export function buildPrompt(rawList: string): string {
  const list = rawList.trim() || '(cole aqui a sua lista)';
  return PROMPT_TEMPLATE.replace(PLACEHOLDER, list);
}

export function buildEmptyPrompt(): string {
  return PROMPT_TEMPLATE.replace(PLACEHOLDER, '(cole aqui a sua lista)');
}

export function buildShortPrompt(rawList: string): string {
  const compactAisles = AISLES.map((a) => `${a.order}|${a.name}`).join(' ');
  return `Converta a lista abaixo em JSON {"version":1,"items":[...]} com os campos
name, qty, unit, qtyAssumed, aisle, aisleOrder, category, confidence.
Responda só o JSON, sem markdown. Unidades: ${UNITS.join('|')}.
Corredores (use o par número|nome exato): ${compactAisles}.
Sem quantidade -> qty 1, unit "un", qtyAssumed true. Expanda abreviações.
Uma linha com vários itens gera vários objetos. Ignore o que não é produto.

LISTA:
"""
${rawList.trim() || '(cole aqui a sua lista)'}
"""`;
}

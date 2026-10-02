# Prompt para a IA categorizar a lista

Copie o bloco abaixo inteiro, substitua `{{LISTA}}` pelo texto cru do WhatsApp e
cole no ChatGPT / Claude / Gemini. Depois copie o JSON da resposta e cole no
campo de import do app.

> No app esse template fica em `src/lib/prompt.ts` e o botão
> **"Copiar prompt com a minha lista"** já faz essa substituição por você.

---

````text
Você é um assistente de organização de compras de supermercado no Brasil.

TAREFA
Converter a lista bruta abaixo (copiada de uma conversa de WhatsApp) em JSON estruturado.

REGRAS DE SAÍDA
1. Responda APENAS com o JSON. Sem explicação, sem comentários, sem cercas de markdown.
2. Um objeto por produto. Se uma linha tiver vários ("arroz, feijão e óleo"), gere um item para cada.
3. Ignore o que não é item: saudações, "ok", "vou comprar", horários, nomes de quem mandou, emojis soltos, risadas.

REGRAS DE CONTEÚDO
4. "name": descrição limpa e capitalizada, SEM a quantidade dentro. Expanda abreviação
   do dia a dia (ptt → "Papel toalha", pq → "Papel higiênico", sb → "Sabão",
   det → "Detergente", ovo → "Ovos"). Mantenha a marca quando citada ("Leite Itambé").
   Mantenha o tamanho/volume quando citado ("Coca-Cola 2L").
5. "qty" e "unit": extraia quando houver.
   "2kg tomate" → qty 2, unit "kg"
   "3 leite"    → qty 3, unit "un"
   "meio quilo de queijo" → qty 0.5, unit "kg"
   "uma dúzia de ovos"    → qty 1, unit "dz"
   "500ml de creme de leite" → qty 500, unit "ml"
   Sem quantidade na mensagem → qty 1, unit "un", e "qtyAssumed": true.
   Caso contrário, "qtyAssumed": false.
6. Unidades permitidas (use exatamente estas): un, kg, g, l, ml, pct, cx, dz, bdj, fd
   (pct = pacote, cx = caixa, dz = dúzia, bdj = bandeja, fd = fardo)
7. "aisle" e "aisleOrder": escolha EXATAMENTE UM par da tabela de corredores
   abaixo, copiando o número e o nome sem alterar nada.
8. "category": o tipo do produto, mais específico. Escolha da lista de tipos abaixo.
9. "notes": só se a mensagem trouxer instrução relevante — "o mais barato",
   "da marca X", "se tiver promoção", "verde", "sem lactose". Senão, omita.
10. Duplicados: una itens iguais somando a quantidade. Se as unidades divergirem
    (2 un de leite e 1 l de leite), mantenha separados.
11. "confidence": 0 a 1, o quanto você tem certeza da categorização.
    Se for menor que 0.7, inclua "needsReview": true.
12. "rawText": o trecho original da mensagem que gerou o item.

TABELA DE CORREDORES (aisleOrder | aisle) — na ordem de caminhada da loja
1  | Hortifruti
2  | Padaria
3  | Frios e Laticínios
4  | Carnes e Peixes
5  | Congelados
6  | Mercearia Salgada
7  | Mercearia Doce
8  | Matinais
9  | Bebidas
10 | Limpeza
11 | Higiene e Beleza
12 | Bebê
13 | Pet
14 | Utilidades e Bazar
15 | Farmácia
99 | Outros

TIPOS PERMITIDOS (category)
Frutas, Legumes, Verduras, Carnes vermelhas, Aves, Peixes, Leite e derivados,
Queijos e embutidos, Pães, Grãos e cereais, Massas, Molhos e conservas,
Óleos e temperos, Biscoitos e snacks, Doces e sobremesas, Café e chá,
Bebidas não alcoólicas, Bebidas alcoólicas, Limpeza de casa, Limpeza de roupas,
Higiene pessoal, Beleza, Papelaria e utilidades, Descartáveis, Pet, Bebê,
Medicamentos, Outros

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
      "rawText": "ptt",
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
{{LISTA}}
"""
````

---

## Variante curta (para colar rápido no celular)

Use quando a lista é pequena e você não quer o prompt gigante:

````text
Converta a lista abaixo em JSON {"version":1,"items":[...]} com os campos
name, qty, unit, qtyAssumed, aisle, aisleOrder, category, confidence.
Responda só o JSON, sem markdown. Unidades: un|kg|g|l|ml|pct|cx|dz|bdj|fd.
Corredores (use o par número|nome exato): 1|Hortifruti 2|Padaria
3|Frios e Laticínios 4|Carnes e Peixes 5|Congelados 6|Mercearia Salgada
7|Mercearia Doce 8|Matinais 9|Bebidas 10|Limpeza 11|Higiene e Beleza 12|Bebê
13|Pet 14|Utilidades e Bazar 15|Farmácia 99|Outros.
Sem quantidade → qty 1, unit "un", qtyAssumed true. Expanda abreviações.
Uma linha com vários itens gera vários objetos. Ignore o que não é produto.

LISTA:
"""
{{LISTA}}
"""
````

---

## Notas de engenharia do prompt

- **A tabela de corredores com número é o truque central.** Pedir o par
  `aisleOrder | aisle` faz o modelo escolher de um conjunto fechado em vez de
  inventar nome, e já entrega a ordem de caminhada da loja pronta para ordenar.
- **`qtyAssumed`** separa "você pediu 1" de "eu chutei 1". Sem esse campo o app
  não sabe qual quantidade merece sua conferência.
- **`confidence` + `needsReview`** transformam o erro da IA em fila de revisão de
  2 itens, em vez de desconfiança sobre os 20.
- **`rawText`** permite voltar à mensagem original quando a interpretação sai
  estranha — e alimenta o catálogo aprendido.
- O app nunca confia no formato: o parser tolera cercas de markdown, texto em
  volta e array solto, e o Zod faz fallback de `aisle`/`unit` desconhecidos.

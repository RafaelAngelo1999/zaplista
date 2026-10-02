# Configuração do Supabase (Fase 3 — compartilhamento)

> **Só é necessário na Fase 3.** As Fases 0, 1 e 2 rodam inteiramente no
> navegador com localStorage. Se você nunca configurar isso, o app funciona —
> só não sincroniza entre duas pessoas.

---

## Decisão de arquitetura: Broadcast, não `postgres_changes`

Existe uma armadilha aqui que vale explicar antes do passo a passo.

O jeito "óbvio" de sincronizar seria escutar `postgres_changes` na tabela. Mas o
Realtime do Postgres **respeita o RLS do papel que está escutando**: para o
cliente `anon` receber os eventos, ele precisaria de uma policy de `SELECT` na
tabela. E como uma policy não recebe parâmetro do cliente, a única que
funcionaria seria `using (true)` — ou seja, qualquer pessoa com a anon key
(que é pública, fica no bundle do front) poderia baixar **todas as listas de
todos os usuários**.

Então o desenho é outro:

| Função | Mecanismo |
|---|---|
| Persistir e ler a lista | 3 funções RPC `security definer` (a tabela fica inacessível direto) |
| Avisar o outro na hora | Realtime **Broadcast** num canal público chamado `list:<uuid>` |

A tabela nunca é exposta. O canal é nomeado pelo `id` (UUID v4, inadivinhável),
não pelo `share_code` de 6 caracteres. E como Broadcast é "fire and forget",
o cliente sempre hidrata com `list_get()` ao abrir e ao voltar o foco — assim
quem estava offline não perde nada.

---

## Passo 1 — Criar o projeto (dashboard)

1. Entre em [supabase.com](https://supabase.com) → **New project**.
2. Nome: `compras`. Região: **South America (São Paulo)** — menor latência.
3. Guarde a senha do banco (você não vai usar no app, mas não dá para recuperar).
4. Plano **Free** resolve: 500MB de banco, 2 milhões de mensagens Realtime/mês,
   200 conexões simultâneas. Para duas pessoas é folga enorme.

⚠️ **Atenção ao Free tier**: projeto sem nenhuma requisição por ~7 dias é
**pausado** automaticamente, e você precisa reativar pelo dashboard. Se vocês
usarem semanalmente, nunca pausa. Se pausar, nada é perdido — só demora ~1min
para voltar.

---

## Passo 2 — Pegar as credenciais

**Project Settings → API Keys**, copie dois valores. O dashboard novo do
Supabase usa os nomes **publishable** / **secret** em vez dos antigos
`anon` / `service_role` — são o mesmo papel, nomes novos:

| Valor | Formato | Vai para |
|---|---|---|
| **Project URL** | `https://xxxx.supabase.co` | `VITE_SUPABASE_URL` |
| **Publishable key** (default) | `sb_publishable_...` | `VITE_SUPABASE_ANON_KEY` |

A **publishable key** é **pública por design** — ela vai no bundle do front e
qualquer um pode ler. Isso é seguro *porque* todo acesso passa pelas 3 RPCs e a
tabela tem RLS sem policy nenhuma.

🚫 **Nunca** use a **secret key** (`sb_secret_...`, equivalente à antiga
`service_role`) no front. Ela ignora RLS e dá acesso total ao banco — serve só
para backend, e este projeto não tem backend. Se ela foi exposta em algum lugar
(colada num chat, commitada por engano), gire-a em Project Settings → API Keys.

No projeto, crie `.env.local` (já no `.gitignore`):

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

---

## Passo 3 — Rodar o SQL

**SQL Editor → New query**, cole o script inteiro e **Run**. É idempotente, pode
rodar de novo sem medo.

```sql
-- ─────────────────────────────────────────────────────────────
-- compras — schema da Fase 3
-- ─────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- 1. TABELA ────────────────────────────────────────────────────
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  share_code  text unique not null,
  title       text not null default 'Lista de compras',
  items       jsonb not null default '[]'::jsonb,
  revision    bigint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists lists_share_code_idx on public.lists (share_code);
create index if not exists lists_updated_at_idx on public.lists (updated_at);

-- 2. RLS: ligada e SEM POLICY → ninguém acessa a tabela direto ─
alter table public.lists enable row level security;
revoke all on table public.lists from anon, authenticated;

-- 3. GERADOR DE CÓDIGO (não exposto ao cliente) ────────────────
-- Alfabeto sem caracteres ambíguos (I, O, 0, 1) para ditar por voz.
create or replace function public.gen_share_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.lists where share_code = code);
  end loop;
  return code;
end;
$$;

-- 4. SERIALIZADOR comum ────────────────────────────────────────
create or replace function public.list_as_json(p_row public.lists, p_status text)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'status',    p_status,
    'id',        p_row.id,
    'shareCode', p_row.share_code,
    'title',     p_row.title,
    'items',     p_row.items,
    'revision',  p_row.revision,
    'updatedAt', p_row.updated_at
  );
$$;

-- 5. RPC: criar lista compartilhada ────────────────────────────
create or replace function public.list_create(
  p_title text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.lists;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'ITEMS_MUST_BE_ARRAY';
  end if;
  if jsonb_array_length(p_items) > 500 then
    raise exception 'TOO_MANY_ITEMS';
  end if;

  insert into public.lists (share_code, title, items)
  values (
    public.gen_share_code(),
    coalesce(nullif(btrim(p_title), ''), 'Lista de compras'),
    p_items
  )
  returning * into v_row;

  return public.list_as_json(v_row, 'ok');
end;
$$;

-- 6. RPC: ler lista pelo código ────────────────────────────────
create or replace function public.list_get(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.lists;
begin
  select * into v_row
    from public.lists
   where share_code = upper(btrim(p_code));

  if not found then
    raise exception 'LIST_NOT_FOUND';
  end if;

  return public.list_as_json(v_row, 'ok');
end;
$$;

-- 7. RPC: gravar com concorrência otimista ─────────────────────
-- Se a revision do cliente está defasada, NÃO sobrescreve: devolve
-- status 'conflict' + o estado do servidor. O cliente faz o merge
-- (last-write-wins por item, via updatedAt) em TypeScript e reenvia.
create or replace function public.list_push(
  p_code          text,
  p_items         jsonb,
  p_base_revision bigint,
  p_title         text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.lists;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'ITEMS_MUST_BE_ARRAY';
  end if;
  if jsonb_array_length(p_items) > 500 then
    raise exception 'TOO_MANY_ITEMS';
  end if;
  if pg_column_size(p_items) > 1048576 then
    raise exception 'PAYLOAD_TOO_LARGE';
  end if;

  select * into v_row
    from public.lists
   where share_code = upper(btrim(p_code))
     for update;

  if not found then
    raise exception 'LIST_NOT_FOUND';
  end if;

  if v_row.revision <> p_base_revision then
    return public.list_as_json(v_row, 'conflict');
  end if;

  update public.lists
     set items      = p_items,
         title      = coalesce(nullif(btrim(p_title), ''), v_row.title),
         revision   = v_row.revision + 1,
         updated_at = now()
   where id = v_row.id
  returning * into v_row;

  return public.list_as_json(v_row, 'ok');
end;
$$;

-- 8. GRANTS: expõe só as 3 RPCs ────────────────────────────────
-- Postgres concede EXECUTE a PUBLIC por padrão, então revogamos antes.
revoke execute on function public.gen_share_code()                       from public, anon, authenticated;
revoke execute on function public.list_as_json(public.lists, text)       from public, anon, authenticated;
revoke execute on function public.list_create(text, jsonb)               from public;
revoke execute on function public.list_get(text)                         from public;
revoke execute on function public.list_push(text, jsonb, bigint, text)   from public;

grant execute on function public.list_create(text, jsonb)             to anon, authenticated;
grant execute on function public.list_get(text)                       to anon, authenticated;
grant execute on function public.list_push(text, jsonb, bigint, text) to anon, authenticated;
```

### Verificação rápida (rode depois, no mesmo SQL Editor)

```sql
-- Deve criar e devolver um shareCode de 6 letras:
select public.list_create('Teste', '[{"name":"Arroz"}]'::jsonb);

-- Deve devolver a mesma lista (troque pelo código devolvido acima):
select public.list_get('XXXXXX');

-- Deve FALHAR com "permission denied" — prova que a tabela está fechada:
set role anon;
select * from public.lists;
reset role;
```

Se o último comando **não** falhar, pare: algo deu errado nos grants e as listas
estão abertas.

---

## Passo 4 — Realtime

**Não há nada a criar.** Broadcast em canal público funciona com a anon key sem
configuração.

Duas coisas para conferir no dashboard:

1. **Database → Replication / Publications**: a tabela `lists` **não** deve estar
   na publicação `supabase_realtime`. Não usamos `postgres_changes`, e deixá-la
   lá só gera tráfego inútil (que ninguém receberia, já que `anon` não tem SELECT).
2. **Realtime → Settings**: se existir a opção de *private channels* /
   *channel authorization*, ela deve estar **desligada** (é o padrão). Ligada,
   ela exige policy em `realtime.messages` e os canais públicos param de funcionar.

---

## Passo 5 — Dependência no app

```bash
npm i @supabase/supabase-js
```

E o cliente, em `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fase 3 é opcional: sem env, o app segue 100% local.
export const supabase = url && key
  ? createClient(url, key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;

export const isSharingAvailable = () => supabase !== null;
```

---

## Como o app vai usar (resumo do contrato)

| Ação no app | Chamada |
|---|---|
| "Compartilhar esta lista" | `rpc('list_create', { p_title, p_items })` → guarda `id` + `shareCode` |
| Entrar com um código | `rpc('list_get', { p_code })` → hidrata o store local |
| Marcar/editar um item | `rpc('list_push', { p_code, p_items, p_base_revision })` **+** `channel.send(...)` |
| Receber mudança do outro | `supabase.channel('list:' + id).on('broadcast', { event: 'ops' }, …)` |
| Voltar o foco na aba / reconectar | `rpc('list_get')` + descarrega a fila offline |
| `status: 'conflict'` | merge LWW por item em `src/lib/merge.ts` e reenvia com a nova `revision` |

---

## Opcional — faxina automática

Listas abandonadas ficam no banco para sempre. Se incomodar, no dashboard
**Database → Extensions** habilite `pg_cron` e rode:

```sql
select cron.schedule(
  'purge-listas-antigas',
  '0 4 * * 0',                                   -- domingo, 04:00
  $$ delete from public.lists where updated_at < now() - interval '120 days' $$
);
```

---

## Checklist

- [ ] Projeto criado na região São Paulo
- [ ] `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env.local` (gitignored)
- [ ] Script SQL executado sem erro
- [ ] `select public.list_create('Teste','[]')` devolveu um `shareCode`
- [ ] `set role anon; select * from public.lists;` **falhou** com permission denied
- [ ] `lists` fora da publicação `supabase_realtime`
- [ ] `@supabase/supabase-js` instalado

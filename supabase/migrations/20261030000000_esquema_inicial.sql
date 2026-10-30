-- Grimório: esquema inicial
-- Rode inteiro no SQL Editor do Supabase (ou com `supabase db push`).
-- Baseado no plano (seções 5.2 a 5.8), com as correções de permissão:
--   * player não altera PE/PE máx. direto (trava "pe"); só via Reforçar/Refazer
--   * ficha criada pelo player nasce com os valores padrão de vida, PE e travas
--   * player não adiciona itens ao inventário (só o mestre entrega)

-- ========== PERFIS ==========
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default 'Jogador',
  created_at timestamptz default now()
);

-- cria o perfil automaticamente no cadastro
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- ========== CAMPANHA ==========
create table public.campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  mestre_id uuid not null references public.profiles,
  codigo_convite text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz default now()
);

create table public.membros (
  campanha_id uuid references public.campanhas on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  papel text not null check (papel in ('mestre','player')),
  primary key (campanha_id, user_id)
);

-- ========== FICHA ==========
create table public.personagens (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.campanhas on delete cascade,
  dono_id uuid not null references public.profiles,
  nome text not null,
  nivel text default 'I',
  retrato_path text,
  descricao text default '',
  caminho text default '',
  vida int not null default 20 check (vida >= 0),
  vida_max int not null default 20 check (vida_max > 0),
  defesa int not null default 0,
  corrupcao int not null default 0,
  congelado int not null default 0,
  pe int not null default 7 check (pe >= 0),
  pe_max int not null default 7,
  conhecimentos text[] not null default '{}',
  enganou_morte boolean not null default false,
  travas jsonb not null default '{"atributos": true, "vida_max": true, "pe": true}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.atributos (
  id uuid primary key default gen_random_uuid(),
  personagem_id uuid not null references public.personagens on delete cascade,
  grupo text not null check (grupo in ('forca','mental','social')),
  nome text not null,
  valor int not null check (valor between 0 and 100),
  ordem int not null default 0
);

-- ========== CATÁLOGOS DO MESTRE ==========
create table public.cartas (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.campanhas on delete cascade,
  tipo text not null check (tipo in ('arquetipo','trauma','habilidade','revolta')),
  nome text not null,
  citacao text,
  efeitos text[] not null default '{}',
  imagem_path text,
  custo text
);

create table public.personagem_cartas (
  personagem_id uuid references public.personagens on delete cascade,
  carta_id uuid references public.cartas on delete cascade,
  primary key (personagem_id, carta_id)
);

create table public.itens (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.campanhas on delete cascade,
  nome text not null,
  raridade text not null check (raridade in ('comum','incomum','unico')),
  efeito text,
  descricao text,
  imagem_path text,
  max_memorias int not null default 0
);

create table public.inventario (
  id uuid primary key default gen_random_uuid(),
  personagem_id uuid not null references public.personagens on delete cascade,
  item_id uuid not null references public.itens on delete cascade,
  quantidade int not null default 1 check (quantidade >= 0),
  memorias_desbloqueadas int not null default 0
);

create table public.gracas (
  id uuid primary key default gen_random_uuid(),
  personagem_id uuid not null references public.personagens on delete cascade,
  forma text not null check (forma in ('circulo','quadrado','triangulo','estrela')),
  nome text,
  descricao text
);

-- ========== LOGS ==========
create table public.rolagens (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.campanhas on delete cascade,
  personagem_id uuid not null references public.personagens on delete cascade,
  autor_id uuid references public.profiles default auth.uid(),
  atributo text not null,
  alvo int not null,
  resultado int not null check (resultado between 1 and 100),
  sucesso boolean generated always as (resultado < alvo) stored,
  modificadores text[] not null default '{}',
  created_at timestamptz default now()
);

create table public.alteracoes (
  id bigint generated always as identity primary key,
  campanha_id uuid not null,
  personagem_id uuid,
  autor_id uuid default auth.uid(),
  tabela text not null,
  campo text not null,
  de text,
  para text,
  created_at timestamptz default now()
);

-- ========== FUNÇÕES DE PERMISSÃO ==========
create function public.is_membro(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where campanha_id = c and user_id = auth.uid());
$$;

create function public.is_mestre(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where campanha_id = c and user_id = auth.uid() and papel = 'mestre');
$$;

-- pode ver/editar a ficha?
create function public.pode_editar_ficha(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from personagens
    where id = p and (dono_id = auth.uid() or is_mestre(campanha_id))
  );
$$;

-- pode editar os atributos? (mestre sempre; dono só se não estiver travado)
create function public.pode_editar_atributos(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from personagens
    where id = p and (
      is_mestre(campanha_id)
      or (dono_id = auth.uid() and not coalesce((travas->>'atributos')::boolean, true))
    )
  );
$$;

-- é o mestre da campanha deste personagem?
create function public.is_mestre_do_personagem(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from personagens where id = p and is_mestre(campanha_id));
$$;

-- as RPCs do jogo ligam esta flag para os triggers deixarem passar o gasto de PE
create function public.em_rpc() returns boolean
language sql stable as $$
  select coalesce(current_setting('grimorio.rpc', true), '') = 'on';
$$;

-- ========== RLS ==========
alter table profiles          enable row level security;
alter table campanhas         enable row level security;
alter table membros           enable row level security;
alter table personagens       enable row level security;
alter table atributos         enable row level security;
alter table cartas            enable row level security;
alter table personagem_cartas enable row level security;
alter table itens             enable row level security;
alter table inventario        enable row level security;
alter table gracas            enable row level security;
alter table rolagens          enable row level security;
alter table alteracoes        enable row level security;

-- perfis: todos logados leem nomes; cada um edita o seu
create policy "ler perfis"    on profiles for select to authenticated using (true);
create policy "editar perfil" on profiles for update using (id = auth.uid());

-- campanha: membros leem; mestre edita (criação só pela RPC criar_campanha)
create policy "ler campanha"    on campanhas for select using (is_membro(id));
create policy "editar campanha" on campanhas for update using (is_mestre(id));

create policy "ler membros" on membros for select using (is_membro(campanha_id));

-- fichas: dono e mestre leem/editam; player cria a própria; mestre apaga
create policy "ler ficha"    on personagens for select using (dono_id = auth.uid() or is_mestre(campanha_id));
create policy "criar ficha"  on personagens for insert with check (dono_id = auth.uid() and is_membro(campanha_id));
create policy "editar ficha" on personagens for update using (dono_id = auth.uid() or is_mestre(campanha_id));
create policy "apagar ficha" on personagens for delete using (is_mestre(campanha_id));

-- atributos
create policy "ler atributos"    on atributos for select using (pode_editar_ficha(personagem_id));
create policy "editar atributos" on atributos for all
  using (pode_editar_atributos(personagem_id)) with check (pode_editar_atributos(personagem_id));

-- catálogos: membros leem; só o mestre cria/edita
create policy "ler cartas"    on cartas for select using (is_membro(campanha_id));
create policy "mestre cartas" on cartas for all using (is_mestre(campanha_id)) with check (is_mestre(campanha_id));
create policy "ler itens"     on itens  for select using (is_membro(campanha_id));
create policy "mestre itens"  on itens  for all using (is_mestre(campanha_id)) with check (is_mestre(campanha_id));

-- cartas do personagem: lê quem vê a ficha; só o mestre dá/tira cartas
create policy "ler cartas do pj"    on personagem_cartas for select using (pode_editar_ficha(personagem_id));
create policy "mestre cartas do pj" on personagem_cartas for all
  using (is_mestre_do_personagem(personagem_id)) with check (is_mestre_do_personagem(personagem_id));

-- inventário: dono e mestre leem, mudam a quantidade e removem; só o mestre adiciona
create policy "ler inventario"     on inventario for select using (pode_editar_ficha(personagem_id));
create policy "editar inventario"  on inventario for update
  using (pode_editar_ficha(personagem_id)) with check (pode_editar_ficha(personagem_id));
create policy "remover inventario" on inventario for delete using (pode_editar_ficha(personagem_id));
create policy "mestre adiciona"    on inventario for insert with check (is_mestre_do_personagem(personagem_id));

-- graças: lê quem vê a ficha; só o mestre mexe
create policy "ler gracas"    on gracas for select using (pode_editar_ficha(personagem_id));
create policy "mestre gracas" on gracas for all
  using (is_mestre_do_personagem(personagem_id)) with check (is_mestre_do_personagem(personagem_id));

-- rolagens: só leitura direta (criadas pelas funções RPC)
create policy "ler rolagens" on rolagens for select
  using (is_mestre(campanha_id) or pode_editar_ficha(personagem_id));

-- histórico: mestre vê tudo; player vê o da própria ficha
create policy "ler alteracoes" on alteracoes for select
  using (is_mestre(campanha_id) or (personagem_id is not null and pode_editar_ficha(personagem_id)));

-- ========== TRAVAS DO MESTRE ==========
-- impede o player de mexer em campo travado ou nas próprias travas
create function public.aplicar_travas() returns trigger
language plpgsql set search_path = public as $$
begin
  if not is_mestre(old.campanha_id) then
    if new.travas is distinct from old.travas then
      raise exception 'Só o mestre altera as travas';
    end if;
    if new.dono_id <> old.dono_id or new.campanha_id <> old.campanha_id then
      raise exception 'Campo protegido';
    end if;
    if coalesce((old.travas->>'vida_max')::boolean, true) and new.vida_max <> old.vida_max then
      raise exception 'Vida máxima travada pelo mestre';
    end if;
    -- PE só muda pelo Reforçar/Refazer (em_rpc) enquanto a trava "pe" estiver ligada
    if coalesce((old.travas->>'pe')::boolean, true) and not em_rpc()
       and (new.pe <> old.pe or new.pe_max <> old.pe_max) then
      raise exception 'PE travado pelo mestre';
    end if;
  end if;
  new.vida := least(new.vida, new.vida_max);
  new.pe := least(new.pe, new.pe_max);
  new.updated_at := now();
  return new;
end $$;

create trigger travas_personagem before update on personagens
for each row execute function aplicar_travas();

-- ficha nova do player: valores padrão e travas ligadas, não importa o que ele enviou
create function public.nova_ficha_antes() returns trigger
language plpgsql set search_path = public as $$
begin
  if not is_mestre(new.campanha_id) then
    new.travas := '{"atributos": true, "vida_max": true, "pe": true}';
    new.vida := 20;
    new.vida_max := 20;
    new.pe := 7;
    new.pe_max := 7;
    new.defesa := 0;
    new.corrupcao := 0;
    new.congelado := 0;
    new.enganou_morte := false;
  end if;
  return new;
end $$;

create trigger travas_nova_ficha before insert on personagens
for each row execute function nova_ficha_antes();

-- cria os atributos da ficha nova
create function public.nova_ficha_atributos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into atributos (personagem_id, grupo, nome, valor, ordem) values
    (new.id,'forca','Força',20,1),(new.id,'forca','Movimento',20,2),
    (new.id,'forca','Furtividade',20,3),(new.id,'forca','Resistência',20,4),
    (new.id,'mental','Vasculhar',20,1),(new.id,'mental','Percepção',20,2),
    (new.id,'mental','Conhecimento',20,3),(new.id,'mental','Atirar',20,4),
    (new.id,'social','Lábia',20,1),(new.id,'social','Intimidação',20,2),
    (new.id,'social','Adestramento',20,3),(new.id,'social','Sorte',20,4),
    (new.id,'social','Presença',20,5);
  return new;
end $$;

create trigger atributos_nova_ficha after insert on personagens
for each row execute function nova_ficha_atributos();

-- inventário: o player só muda a quantidade
create function public.travas_inventario() returns trigger
language plpgsql set search_path = public as $$
begin
  if not is_mestre_do_personagem(old.personagem_id) then
    if new.personagem_id <> old.personagem_id or new.item_id <> old.item_id
       or new.memorias_desbloqueadas <> old.memorias_desbloqueadas then
      raise exception 'Só o mestre altera isso no inventário';
    end if;
  end if;
  return new;
end $$;

create trigger travas_inventario before update on inventario
for each row execute function travas_inventario();

-- ========== HISTÓRICO ==========
-- grava cada campo alterado da ficha
create function public.registrar_alteracao_ficha() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into alteracoes (campanha_id, personagem_id, autor_id, tabela, campo, de, para)
  select new.campanha_id, new.id, auth.uid(), 'personagens', n.key, o.value #>> '{}', n.value #>> '{}'
  from jsonb_each(to_jsonb(new)) n
  join jsonb_each(to_jsonb(old)) o using (key)
  where n.value is distinct from o.value and n.key not in ('updated_at');
  return new;
end $$;

create trigger log_personagem after update on personagens
for each row execute function registrar_alteracao_ficha();

-- histórico de atributos
create function public.registrar_alteracao_atributo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.valor is distinct from old.valor then
    insert into alteracoes (campanha_id, personagem_id, autor_id, tabela, campo, de, para)
    select p.campanha_id, p.id, auth.uid(), 'atributos', new.nome, old.valor::text, new.valor::text
    from personagens p where p.id = new.personagem_id;
  end if;
  return new;
end $$;

create trigger log_atributo after update on atributos
for each row execute function registrar_alteracao_atributo();

-- ========== RPC (regras do jogo) ==========
-- entrar na mesa pelo código de convite
create function public.entrar_campanha(p_codigo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  select id into c from campanhas where codigo_convite = upper(trim(p_codigo));
  if c is null then raise exception 'Código inválido'; end if;
  insert into membros (campanha_id, user_id, papel) values (c, auth.uid(), 'player')
  on conflict do nothing;
  return c;
end $$;

-- criar campanha já registrando o criador como mestre
create function public.criar_campanha(p_nome text) returns campanhas
language plpgsql security definer set search_path = public as $$
declare c campanhas;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  insert into campanhas (nome, mestre_id) values (p_nome, auth.uid()) returning * into c;
  insert into membros (campanha_id, user_id, papel) values (c.id, auth.uid(), 'mestre');
  return c;
end $$;

-- rolar o D100 no servidor (ninguém forja o resultado)
create function public.rolar_d100(p_atributo_id uuid) returns rolagens
language plpgsql security definer set search_path = public as $$
declare a atributos; p personagens; r rolagens;
begin
  select * into a from atributos where id = p_atributo_id;
  if not found then raise exception 'Atributo não encontrado'; end if;
  select * into p from personagens where id = a.personagem_id;
  if p.dono_id <> auth.uid() and not is_mestre(p.campanha_id) then
    raise exception 'Sem permissão';
  end if;
  insert into rolagens (campanha_id, personagem_id, atributo, alvo, resultado)
  values (p.campanha_id, p.id, a.nome, a.valor, 1 + floor(random() * 100)::int)
  returning * into r;
  return r;
end $$;

-- Reforçar: −1 PE, −10 no resultado (CONFIRMAR A REGRA REAL)
create function public.reforcar(p_rolagem_id uuid) returns rolagens
language plpgsql security definer set search_path = public as $$
declare r rolagens; p personagens;
begin
  select * into r from rolagens where id = p_rolagem_id for update;
  if not found then raise exception 'Rolagem não encontrada'; end if;
  select * into p from personagens where id = r.personagem_id for update;
  if p.dono_id <> auth.uid() and not is_mestre(p.campanha_id) then raise exception 'Sem permissão'; end if;
  if 'Reforçado' = any(r.modificadores) then raise exception 'Já reforçado'; end if;
  if p.pe < 1 then raise exception 'PE insuficiente'; end if;
  perform set_config('grimorio.rpc', 'on', true);
  update personagens set pe = pe - 1 where id = p.id;
  perform set_config('grimorio.rpc', '', true);
  update rolagens set resultado = greatest(1, resultado - 10),
                      modificadores = array_append(modificadores, 'Reforçado')
  where id = r.id returning * into r;
  return r;
end $$;

-- Refazer: −2 PE, rola de novo
create function public.refazer(p_rolagem_id uuid) returns rolagens
language plpgsql security definer set search_path = public as $$
declare r rolagens; p personagens;
begin
  select * into r from rolagens where id = p_rolagem_id for update;
  if not found then raise exception 'Rolagem não encontrada'; end if;
  select * into p from personagens where id = r.personagem_id for update;
  if p.dono_id <> auth.uid() and not is_mestre(p.campanha_id) then raise exception 'Sem permissão'; end if;
  if p.pe < 2 then raise exception 'PE insuficiente'; end if;
  perform set_config('grimorio.rpc', 'on', true);
  update personagens set pe = pe - 2 where id = p.id;
  perform set_config('grimorio.rpc', '', true);
  update rolagens set resultado = 1 + floor(random() * 100)::int,
                      modificadores = array_append(modificadores, 'Refeito')
  where id = r.id returning * into r;
  return r;
end $$;

-- mestre entrega item (respeita os espaços do inventário)
create function public.entregar_item(p_personagem uuid, p_item uuid, p_qtd int default 1) returns void
language plpgsql security definer set search_path = public as $$
declare p personagens; existente inventario; ocupados int;
begin
  select * into p from personagens where id = p_personagem;
  if not found or not is_mestre(p.campanha_id) then raise exception 'Só o mestre entrega itens'; end if;
  if not exists (select 1 from itens where id = p_item and campanha_id = p.campanha_id) then
    raise exception 'Item não é desta campanha';
  end if;
  if p_qtd < 1 then raise exception 'Quantidade inválida'; end if;
  select * into existente from inventario where personagem_id = p_personagem and item_id = p_item;
  if found then
    update inventario set quantidade = quantidade + p_qtd where id = existente.id;
  else
    select count(*) into ocupados from inventario where personagem_id = p_personagem;
    if ocupados >= 4 then raise exception 'Inventário cheio'; end if;
    insert into inventario (personagem_id, item_id, quantidade) values (p_personagem, p_item, p_qtd);
  end if;
end $$;

-- ========== ACESSO DA API ==========
-- o RLS acima decide o que cada um vê; aqui só liberamos o acesso para quem está logado
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- ========== REALTIME ==========
alter publication supabase_realtime add table personagens, atributos, inventario, rolagens, alteracoes;

-- ========== STORAGE ==========
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', false)
on conflict (id) do nothing;

-- caminhos: {campanha_id}/retratos/{personagem_id}.webp, {campanha_id}/itens/..., {campanha_id}/cartas/...
create function public.pode_enviar_retrato(caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from personagens p
    where p.id::text = split_part(storage.filename(caminho), '.', 1)
      and p.campanha_id::text = (storage.foldername(caminho))[1]
      and (p.dono_id = auth.uid() or is_mestre(p.campanha_id))
  ) and (storage.foldername(caminho))[2] = 'retratos';
$$;

create function public.is_membro_pasta(caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membros
    where campanha_id::text = (storage.foldername(caminho))[1] and user_id = auth.uid()
  );
$$;

create function public.is_mestre_pasta(caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membros
    where campanha_id::text = (storage.foldername(caminho))[1] and user_id = auth.uid() and papel = 'mestre'
  );
$$;

grant execute on function public.pode_enviar_retrato(text), public.is_membro_pasta(text), public.is_mestre_pasta(text)
  to authenticated;

create policy "membros leem imagens" on storage.objects for select to authenticated
  using (bucket_id = 'imagens' and is_membro_pasta(name));

create policy "enviar retrato" on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens' and pode_enviar_retrato(name));

create policy "trocar retrato" on storage.objects for update to authenticated
  using (bucket_id = 'imagens' and pode_enviar_retrato(name));

create policy "mestre envia catalogo" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'imagens'
    and (storage.foldername(name))[2] in ('itens','cartas')
    and is_mestre_pasta(name)
  );

create policy "mestre troca catalogo" on storage.objects for update to authenticated
  using (
    bucket_id = 'imagens'
    and (storage.foldername(name))[2] in ('itens','cartas')
    and is_mestre_pasta(name)
  );

create policy "apagar imagens" on storage.objects for delete to authenticated
  using (bucket_id = 'imagens' and (pode_enviar_retrato(name) or is_mestre_pasta(name)));

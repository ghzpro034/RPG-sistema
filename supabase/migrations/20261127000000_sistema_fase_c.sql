-- Sistema novo (Compêndio), Fase C: o inventário. Ver docs/SISTEMA.md, seção 12.
--   * itens ganham dano ("D10", "2D10") e criador ("Lucius Francis"); efeito segue como o bônus ("+6 de Resistência")
--   * as memórias de cada item têm nome, descrição e efeito (memorias_item); a ficha mostra as desbloqueadas
--   * memórias limitadas pela raridade: Comum 1, Incomum 3, Único 5 (são as estrelas ★ da ficha)
--   * espaços do inventário por raridade e por ficha (espacos_comum/incomum/unico, padrão 4/2/1); só o mestre muda
--   * entregar_item respeita os espaços da raridade do item

-- ========== ITENS ==========
alter table public.itens add column dano text;
alter table public.itens add column criador text;

-- quantas memórias um item pode ter, pela raridade (Compêndio)
create function public.max_memorias_da_raridade(r text) returns int
language sql immutable as $$
  select case r when 'comum' then 1 when 'incomum' then 3 when 'unico' then 5 else 0 end;
$$;
grant execute on function public.max_memorias_da_raridade(text) to authenticated;

-- itens antigos acima do limite descem para ele; as memórias já abertas acompanham, sem sujar o histórico
update public.itens set max_memorias = max_memorias_da_raridade(raridade)
where max_memorias > max_memorias_da_raridade(raridade);
alter table public.inventario disable trigger user;
update public.inventario i set memorias_desbloqueadas = it.max_memorias
from public.itens it where it.id = i.item_id and i.memorias_desbloqueadas > it.max_memorias;
alter table public.inventario enable trigger user;
alter table public.itens add constraint itens_max_memorias_check
  check (max_memorias between 0 and max_memorias_da_raridade(raridade));

-- ========== MEMÓRIAS DOS ITENS ==========
create table public.memorias_item (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.itens on delete cascade,
  ordem int not null check (ordem between 1 and 5),
  nome text not null,
  descricao text,
  efeito text,
  unique (item_id, ordem)
);
alter table public.memorias_item enable row level security;
-- quem joga com o mestre lê; só o mestre escreve
create policy "ler memorias do item" on public.memorias_item for select
  using (exists (select 1 from itens i where i.id = item_id and joga_com(i.mestre_id)));
create policy "mestre memorias do item" on public.memorias_item for all
  using (exists (select 1 from itens i where i.id = item_id and i.mestre_id = auth.uid()))
  with check (exists (select 1 from itens i where i.id = item_id and i.mestre_id = auth.uid()));
grant select, insert, update, delete on public.memorias_item to authenticated;

-- a ordem da memória cabe no limite da raridade do item
create function public.limitar_memorias_item() returns trigger
language plpgsql set search_path = public as $$
declare limite int;
begin
  select max_memorias_da_raridade(raridade) into limite from itens where id = new.item_id;
  if new.ordem > coalesce(limite, 0) then
    raise exception 'Essa raridade só tem % memória(s)', limite;
  end if;
  return new;
end $$;
create trigger limitar_memorias_item before insert or update on public.memorias_item
for each row execute function public.limitar_memorias_item();

-- ========== ESPAÇOS DO INVENTÁRIO ==========
alter table public.personagens add column espacos_comum int not null default 4 check (espacos_comum between 0 and 20);
alter table public.personagens add column espacos_incomum int not null default 2 check (espacos_incomum between 0 and 20);
alter table public.personagens add column espacos_unico int not null default 1 check (espacos_unico between 0 and 20);

-- só o mestre mexe nos espaços (junto com limites, raça e Caminho)
create or replace function public.aplicar_travas() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.morto_em is not null and new.morto_em is not null then
    raise exception 'Personagem morto: a ficha é só leitura';
  end if;
  if not is_mestre_do_personagem(old.id) then
    if new.morto_em is distinct from old.morto_em or new.epitafio is distinct from old.epitafio then
      raise exception 'Só o mestre decide a morte';
    end if;
    if new.travas is distinct from old.travas then
      raise exception 'Só o mestre altera as travas';
    end if;
    if new.dono_id <> old.dono_id or new.campanha_id <> old.campanha_id then
      raise exception 'Campo protegido';
    end if;
    if coalesce((old.travas->>'vida_max')::boolean, true) and new.vida_max <> old.vida_max then
      raise exception 'Vida máxima travada pelo mestre';
    end if;
    -- PE só muda pelo Reforçar/Refazer/cartas (em_rpc) enquanto a trava "pe" estiver ligada
    if coalesce((old.travas->>'pe')::boolean, true) and not em_rpc()
       and (new.pe <> old.pe or new.pe_max <> old.pe_max) then
      raise exception 'PE travado pelo mestre';
    end if;
    if coalesce((old.travas->>'atributos')::boolean, true)
       and (new.vigor, new.mental, new.social) is distinct from (old.vigor, old.mental, old.social) then
      raise exception 'Características travadas pelo mestre';
    end if;
    if (new.limiar_instavel, new.limite_congelado, new.raca)
       is distinct from (old.limiar_instavel, old.limite_congelado, old.raca) then
      raise exception 'Só o mestre altera os limites e a raça';
    end if;
    if new.caminho is distinct from old.caminho then
      raise exception 'Só o mestre altera o Caminho';
    end if;
    if (new.espacos_comum, new.espacos_incomum, new.espacos_unico)
       is distinct from (old.espacos_comum, old.espacos_incomum, old.espacos_unico) then
      raise exception 'Só o mestre altera os espaços do inventário';
    end if;
    if old.enganou_morte and not new.enganou_morte then
      raise exception 'Só o mestre devolve o Enganar a morte';
    end if;
  end if;
  new.vida := least(new.vida, new.vida_max);
  new.pe := least(new.pe, new.pe_max);
  new.updated_at := now();
  return new;
end $$;

-- ficha criada pelo jogador nasce com os valores padrão
create or replace function public.nova_ficha_antes() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from personagens where dono_id = new.dono_id and morto_em is null) then
    raise exception 'Você já tem um personagem; o mestre pode levá-lo para outras mesas';
  end if;
  if not is_mestre(new.campanha_id) then
    new.travas := '{"atributos": true, "vida_max": true, "pe": true}';
    new.vida := 20;
    new.vida_max := 20;
    new.pe := 7;
    new.pe_max := 7;
    new.defesa := 0;
    new.corrupcao := 0;
    new.congelado := 0;
    new.dentes := 0;
    new.enganou_morte := false;
    new.morto_em := null;
    new.epitafio := null;
    new.vigor := 20;
    new.mental := 20;
    new.social := 20;
    new.limiar_instavel := 5;
    new.limite_congelado := 10;
    new.sinergia := 0;
    new.raca := null;
    new.espacos_comum := 4;
    new.espacos_incomum := 2;
    new.espacos_unico := 1;
  end if;
  return new;
end $$;

-- ========== ENTREGAR ITEM ==========
-- cada linha do inventário ocupa um espaço da raridade do item; itens iguais empilham na mesma linha
create or replace function public.entregar_item(p_personagem uuid, p_item uuid, p_qtd int default 1) returns void
language plpgsql security definer set search_path = public as $$
declare p personagens; existente inventario; v_raridade text; ocupados int; limite int;
begin
  if not is_mestre_do_personagem(p_personagem) then raise exception 'Só o mestre entrega itens'; end if;
  select * into p from personagens where id = p_personagem;
  if p.morto_em is not null then raise exception 'Personagem morto não recebe itens'; end if;
  select raridade into v_raridade from itens where id = p_item and mestre_id = auth.uid();
  if not found then raise exception 'Item não é do seu catálogo'; end if;
  if p_qtd < 1 then raise exception 'Quantidade inválida'; end if;
  select * into existente from inventario where personagem_id = p_personagem and item_id = p_item;
  if found then
    update inventario set quantidade = quantidade + p_qtd where id = existente.id;
  else
    select count(*) into ocupados from inventario i join itens it on it.id = i.item_id
    where i.personagem_id = p_personagem and it.raridade = v_raridade;
    limite := case v_raridade when 'comum' then p.espacos_comum when 'incomum' then p.espacos_incomum else p.espacos_unico end;
    if ocupados >= limite then
      raise exception 'Sem espaço % livre (% de %)',
        case v_raridade when 'comum' then 'Comum' when 'incomum' then 'Incomum' else 'Único' end, ocupados, limite;
    end if;
    insert into inventario (personagem_id, item_id, quantidade) values (p_personagem, p_item, p_qtd);
  end if;
end $$;

revoke execute on function public.limitar_memorias_item() from public, anon;

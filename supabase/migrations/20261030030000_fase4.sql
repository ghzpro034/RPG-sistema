-- Fase 4: catálogo, entregas, habilidade/revolta, memórias e graças, histórico.

-- ao vivo também: cartas dadas pelo mestre e graças
alter publication supabase_realtime add table personagem_cartas, gracas;

-- "Engana a morte 1 vez": o player marca que usou, mas só o mestre devolve o uso
create or replace function public.aplicar_travas() returns trigger
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
    if old.enganou_morte and not new.enganou_morte then
      raise exception 'Só o mestre devolve o Enganar a morte';
    end if;
  end if;
  new.vida := least(new.vida, new.vida_max);
  new.pe := least(new.pe, new.pe_max);
  new.updated_at := now();
  return new;
end $$;

-- histórico do inventário: recebeu, mudou a quantidade, removeu, desbloqueou memória
create function public.registrar_alteracao_inventario() returns trigger
language plpgsql security definer set search_path = public as $$
declare linha inventario; c uuid; nome_item text;
begin
  linha := coalesce(new, old);
  select p.campanha_id into c from personagens p where p.id = linha.personagem_id;
  select i.nome into nome_item from itens i where i.id = linha.item_id;
  if c is null then return null; end if;
  -- item apagado do catálogo (cascata): a linha some sem nome
  nome_item := coalesce(nome_item, 'Item removido do catálogo');

  if tg_op = 'INSERT' then
    insert into alteracoes (campanha_id, personagem_id, autor_id, tabela, campo, de, para)
    values (c, linha.personagem_id, auth.uid(), 'inventario', nome_item, null, new.quantidade::text);
  elsif tg_op = 'DELETE' then
    insert into alteracoes (campanha_id, personagem_id, autor_id, tabela, campo, de, para)
    values (c, linha.personagem_id, auth.uid(), 'inventario', nome_item, old.quantidade::text, null);
  else
    if new.quantidade is distinct from old.quantidade then
      insert into alteracoes (campanha_id, personagem_id, autor_id, tabela, campo, de, para)
      values (c, linha.personagem_id, auth.uid(), 'inventario', nome_item, old.quantidade::text, new.quantidade::text);
    end if;
    if new.memorias_desbloqueadas is distinct from old.memorias_desbloqueadas then
      insert into alteracoes (campanha_id, personagem_id, autor_id, tabela, campo, de, para)
      values (c, linha.personagem_id, auth.uid(), 'memorias', nome_item,
              old.memorias_desbloqueadas::text, new.memorias_desbloqueadas::text);
    end if;
  end if;
  return null;
end $$;

create trigger log_inventario after insert or update or delete on public.inventario
for each row execute function public.registrar_alteracao_inventario();

-- memórias não passam do máximo do item
create function public.limitar_memorias() returns trigger
language plpgsql set search_path = public as $$
declare maximo int;
begin
  select max_memorias into maximo from itens where id = new.item_id;
  if new.memorias_desbloqueadas < 0 or new.memorias_desbloqueadas > coalesce(maximo, 0) then
    raise exception 'Este item tem % memória(s)', coalesce(maximo, 0);
  end if;
  return new;
end $$;

create trigger limitar_memorias before insert or update on public.inventario
for each row execute function public.limitar_memorias();

revoke execute on function public.registrar_alteracao_inventario(), public.limitar_memorias() from public, anon;

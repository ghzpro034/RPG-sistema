-- Morte do personagem: o mestre remove quem morreu.
--   * a ficha vai para o memorial (fica guardada, só leitura) e pode ser trazida de volta
--   * o jogador sai das mesas onde o personagem estava; volta com código e cria outro personagem

alter table public.personagens add column morto_em timestamptz;
alter table public.personagens add column epitafio text;

-- ficha morta é só leitura; e só o mestre decide a morte
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

-- um personagem VIVO por player (quem morreu não conta)
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
  end if;
  return new;
end $$;

-- o mestre registra a morte; o jogador sai das mesas onde o personagem estava
create function public.matar_personagem(p_personagem uuid, p_epitafio text default null) returns void
language plpgsql security definer set search_path = public as $$
declare dono uuid;
begin
  if not is_mestre_do_personagem(p_personagem) then raise exception 'Só o mestre remove quem morreu'; end if;
  select dono_id into dono from personagens where id = p_personagem and morto_em is null;
  if dono is null then raise exception 'Personagem não encontrado ou já está no memorial'; end if;

  update personagens set morto_em = now(), epitafio = nullif(trim(p_epitafio), '') where id = p_personagem;
  delete from membros m
   using mesa_personagens mp
   where mp.personagem_id = p_personagem
     and m.campanha_id = mp.campanha_id
     and m.user_id = dono
     and m.papel = 'player';
end $$;

-- traz de volta do memorial: o jogador volta para as mesas do personagem
create function public.reviver_personagem(p_personagem uuid) returns void
language plpgsql security definer set search_path = public as $$
declare dono uuid;
begin
  if not is_mestre_do_personagem(p_personagem) then raise exception 'Só o mestre traz de volta'; end if;
  select dono_id into dono from personagens where id = p_personagem and morto_em is not null;
  if dono is null then raise exception 'Este personagem não está no memorial'; end if;
  if exists (select 1 from personagens where dono_id = dono and morto_em is null) then
    raise exception 'O jogador já tem outro personagem vivo';
  end if;

  update personagens set morto_em = null where id = p_personagem;
  insert into membros (campanha_id, user_id, papel)
  select mp.campanha_id, dono, 'player' from mesa_personagens mp where mp.personagem_id = p_personagem
  on conflict do nothing;
end $$;

-- mortos não rolam dado
create or replace function public.rolar_d100(p_atributo_id uuid, p_reforcar boolean default false, p_campanha uuid default null)
returns rolagens
language plpgsql security definer set search_path = public as $$
declare a atributos; p personagens; r rolagens; d int[]; mesa uuid;
begin
  select * into a from atributos where id = p_atributo_id;
  if not found then raise exception 'Atributo não encontrado'; end if;
  select * into p from personagens where id = a.personagem_id for update;
  if p.dono_id <> auth.uid() and not is_mestre_do_personagem(p.id) then
    raise exception 'Sem permissão';
  end if;
  if p.morto_em is not null then raise exception 'Personagem morto não rola dado'; end if;
  mesa := case
    when exists (select 1 from mesa_personagens where campanha_id = p_campanha and personagem_id = p.id) then p_campanha
    else p.campanha_id
  end;
  if p_reforcar then
    if p.pe < 1 then raise exception 'PE insuficiente para reforçar'; end if;
    perform gastar_pe(p.id, 1);
  end if;

  d := jogar_d100(case when p_reforcar then 2 else 1 end);
  insert into rolagens (campanha_id, personagem_id, atributo, alvo, resultado, dados, reforcado, modificadores)
  values (mesa, p.id, a.nome, a.valor,
          (select min(x) from unnest(d) x), d, p_reforcar,
          case when p_reforcar then array['Reforçado'] else '{}' end)
  returning * into r;
  return r;
end $$;

-- entrar com código leva junto só o personagem vivo
create or replace function public.entrar_campanha(p_codigo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  select id into c from campanhas where codigo_convite = upper(trim(p_codigo));
  if c is null then raise exception 'Código inválido'; end if;
  insert into membros (campanha_id, user_id, papel) values (c, auth.uid(), 'player')
  on conflict do nothing;
  insert into mesa_personagens (campanha_id, personagem_id)
  select c, id from personagens where dono_id = auth.uid() and morto_em is null
  on conflict do nothing;
  return c;
end $$;

-- colegas: só os vivos
create or replace function public.colegas_da_mesa(p_campanha uuid)
returns table (id uuid, nome text, retrato_path text, jogador text, sou_eu boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.retrato_path, pr.nome, p.dono_id = auth.uid()
  from mesa_personagens mp
  join personagens p on p.id = mp.personagem_id
  join profiles pr on pr.id = p.dono_id
  where mp.campanha_id = p_campanha and is_membro(p_campanha) and p.morto_em is null
  order by p.nome;
$$;

revoke execute on function public.matar_personagem(uuid, text), public.reviver_personagem(uuid) from public, anon;
grant execute on function public.matar_personagem(uuid, text), public.reviver_personagem(uuid) to authenticated;

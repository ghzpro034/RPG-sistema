-- Várias mesas por mestre, e a mesma ficha em várias mesas ao mesmo tempo.
-- Ex.: o player joga uma campanha solo e depois aparece na mesa geral com a MESMA ficha.
--   * um personagem por player
--   * mesa_personagens liga a ficha a cada mesa onde ela está; personagens.campanha_id vira "mesa de origem"
--   * catálogo (itens e cartas) passa a ser do mestre, valendo em todas as mesas dele

-- ========== FICHA EM VÁRIAS MESAS ==========
create table public.mesa_personagens (
  campanha_id uuid references public.campanhas on delete cascade,
  personagem_id uuid references public.personagens on delete cascade,
  entrou_em timestamptz not null default now(),
  primary key (campanha_id, personagem_id)
);

insert into public.mesa_personagens (campanha_id, personagem_id)
select campanha_id, id from public.personagens
on conflict do nothing;

alter table public.mesa_personagens enable row level security;
-- leitura: quem é da mesa; entrar e sair só pelas RPCs abaixo
create policy "ler mesa_personagens" on public.mesa_personagens for select using (is_membro(campanha_id));

-- o mestre de QUALQUER mesa onde a ficha está pode mexer nela
create or replace function public.is_mestre_do_personagem(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mesa_personagens mp
    join membros m on m.campanha_id = mp.campanha_id
    where mp.personagem_id = p and m.user_id = auth.uid() and m.papel = 'mestre'
  );
$$;

create or replace function public.pode_editar_ficha(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from personagens where id = p and dono_id = auth.uid())
      or is_mestre_do_personagem(p);
$$;

create or replace function public.pode_editar_atributos(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_mestre_do_personagem(p) or exists (
    select 1 from personagens
    where id = p and dono_id = auth.uid() and not coalesce((travas->>'atributos')::boolean, true)
  );
$$;

drop policy "ler ficha" on public.personagens;
drop policy "editar ficha" on public.personagens;
drop policy "apagar ficha" on public.personagens;
create policy "ler ficha"    on public.personagens for select using (dono_id = auth.uid() or is_mestre_do_personagem(id));
create policy "editar ficha" on public.personagens for update using (dono_id = auth.uid() or is_mestre_do_personagem(id));
create policy "apagar ficha" on public.personagens for delete using (is_mestre_do_personagem(id));

-- travas: o mestre de qualquer mesa da ficha manda nelas
create or replace function public.aplicar_travas() returns trigger
language plpgsql set search_path = public as $$
begin
  if not is_mestre_do_personagem(old.id) then
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

-- um personagem por player
create or replace function public.nova_ficha_antes() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from personagens where dono_id = new.dono_id) then
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
  end if;
  return new;
end $$;

-- ficha nova já entra na mesa onde foi criada
create function public.nova_ficha_na_mesa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into mesa_personagens (campanha_id, personagem_id) values (new.campanha_id, new.id)
  on conflict do nothing;
  return new;
end $$;

create trigger mesa_nova_ficha after insert on public.personagens
for each row execute function public.nova_ficha_na_mesa();

-- ========== CATÁLOGO DO MESTRE ==========
alter table public.itens  add column mestre_id uuid references public.profiles on delete cascade;
alter table public.cartas add column mestre_id uuid references public.profiles on delete cascade;
update public.itens  i set mestre_id = c.mestre_id from public.campanhas c where c.id = i.campanha_id;
update public.cartas k set mestre_id = c.mestre_id from public.campanhas c where c.id = k.campanha_id;
alter table public.itens  alter column mestre_id set not null, alter column mestre_id set default auth.uid();
alter table public.cartas alter column mestre_id set not null, alter column mestre_id set default auth.uid();
-- a mesa onde o item foi criado fica só como registro
alter table public.itens  alter column campanha_id drop not null;
alter table public.cartas alter column campanha_id drop not null;

-- joga (ou mestra) em alguma mesa deste mestre?
create function public.joga_com(p_mestre uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_mestre = auth.uid() or exists (
    select 1 from membros m join campanhas c on c.id = m.campanha_id
    where c.mestre_id = p_mestre and m.user_id = auth.uid()
  );
$$;

drop policy "ler cartas" on public.cartas;
drop policy "mestre cartas" on public.cartas;
drop policy "ler itens" on public.itens;
drop policy "mestre itens" on public.itens;
create policy "ler cartas"    on public.cartas for select using (joga_com(mestre_id));
create policy "mestre cartas" on public.cartas for all using (mestre_id = auth.uid()) with check (mestre_id = auth.uid());
create policy "ler itens"     on public.itens  for select using (joga_com(mestre_id));
create policy "mestre itens"  on public.itens  for all using (mestre_id = auth.uid()) with check (mestre_id = auth.uid());

-- ========== RPC ==========
-- entrar pelo código: se o player já tem personagem, ele entra na mesa junto
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
  select c, id from personagens where dono_id = auth.uid()
  on conflict do nothing;
  return c;
end $$;

-- mestre traz para esta mesa um personagem que está em outra mesa dele
create function public.importar_personagem(p_personagem uuid, p_campanha uuid) returns void
language plpgsql security definer set search_path = public as $$
declare dono uuid;
begin
  if not is_mestre(p_campanha) then raise exception 'Só o mestre desta mesa traz personagens'; end if;
  if not is_mestre_do_personagem(p_personagem) then
    raise exception 'Este personagem não está em nenhuma mesa sua';
  end if;
  select dono_id into dono from personagens where id = p_personagem;
  insert into membros (campanha_id, user_id, papel) values (p_campanha, dono, 'player')
  on conflict do nothing;
  insert into mesa_personagens (campanha_id, personagem_id) values (p_campanha, p_personagem)
  on conflict do nothing;
end $$;

-- mestre tira o personagem desta mesa (a ficha continua nas outras)
create function public.remover_da_mesa(p_personagem uuid, p_campanha uuid) returns void
language plpgsql security definer set search_path = public as $$
declare dono uuid;
begin
  if not is_mestre(p_campanha) then raise exception 'Só o mestre desta mesa tira personagens'; end if;
  if (select count(*) from mesa_personagens where personagem_id = p_personagem) <= 1 then
    raise exception 'Esta é a única mesa do personagem';
  end if;
  select dono_id into dono from personagens where id = p_personagem;
  delete from mesa_personagens where campanha_id = p_campanha and personagem_id = p_personagem;
  delete from membros where campanha_id = p_campanha and user_id = dono and papel = 'player';
end $$;

-- rolar: a rolagem vai para a mesa onde o player está jogando agora
drop function public.rolar_d100(uuid, boolean);
create function public.rolar_d100(p_atributo_id uuid, p_reforcar boolean default false, p_campanha uuid default null)
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

create or replace function public.refazer(p_rolagem_id uuid) returns rolagens
language plpgsql security definer set search_path = public as $$
declare r rolagens; p personagens; d int[];
begin
  select * into r from rolagens where id = p_rolagem_id for update;
  if not found then raise exception 'Rolagem não encontrada'; end if;
  select * into p from personagens where id = r.personagem_id for update;
  if p.dono_id <> auth.uid() and not is_mestre_do_personagem(p.id) then raise exception 'Sem permissão'; end if;
  if p.pe < 2 then raise exception 'PE insuficiente para refazer'; end if;
  perform gastar_pe(p.id, 2);

  d := jogar_d100(case when r.reforcado then 2 else 1 end);
  update rolagens
     set dados = d,
         resultado = (select min(x) from unnest(d) x),
         refeitos = refeitos + 1,
         modificadores = case when 'Refeito' = any(modificadores) then modificadores
                              else array_append(modificadores, 'Refeito') end
   where id = r.id
  returning * into r;
  return r;
end $$;

-- entregar: item do catálogo deste mestre, para um personagem de uma mesa dele
create or replace function public.entregar_item(p_personagem uuid, p_item uuid, p_qtd int default 1) returns void
language plpgsql security definer set search_path = public as $$
declare existente inventario; ocupados int;
begin
  if not is_mestre_do_personagem(p_personagem) then raise exception 'Só o mestre entrega itens'; end if;
  if not exists (select 1 from itens where id = p_item and mestre_id = auth.uid()) then
    raise exception 'Item não é do seu catálogo';
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

-- colegas: quem está nesta mesa (inclusive quem veio de outra)
create or replace function public.colegas_da_mesa(p_campanha uuid)
returns table (id uuid, nome text, retrato_path text, jogador text, sou_eu boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.retrato_path, pr.nome, p.dono_id = auth.uid()
  from mesa_personagens mp
  join personagens p on p.id = mp.personagem_id
  join profiles pr on pr.id = p.dono_id
  where mp.campanha_id = p_campanha and is_membro(p_campanha)
  order by p.nome;
$$;

revoke execute on function public.joga_com(uuid), public.importar_personagem(uuid, uuid),
  public.remover_da_mesa(uuid, uuid), public.rolar_d100(uuid, boolean, uuid), public.nova_ficha_na_mesa()
  from public, anon;
grant execute on function public.joga_com(uuid), public.importar_personagem(uuid, uuid),
  public.remover_da_mesa(uuid, uuid), public.rolar_d100(uuid, boolean, uuid)
  to authenticated;
grant select on public.mesa_personagens to authenticated;

alter publication supabase_realtime add table mesa_personagens;

-- ========== IMAGENS ==========
-- retrato: pode enviar quem edita a ficha (dono ou mestre de qualquer mesa dela)
create or replace function public.pode_enviar_retrato(caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select (storage.foldername(caminho))[2] = 'retratos' and exists (
    select 1 from personagens p
    where p.id::text = split_part(storage.filename(caminho), '.', 1)
      and p.campanha_id::text = (storage.foldername(caminho))[1]
      and (p.dono_id = auth.uid() or is_mestre_do_personagem(p.id))
  );
$$;

-- retrato: vê quem está em alguma mesa junto com o personagem
create function public.pode_ver_retrato(caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select (storage.foldername(caminho))[2] = 'retratos' and exists (
    select 1 from mesa_personagens mp
    join membros m on m.campanha_id = mp.campanha_id
    where mp.personagem_id::text = split_part(storage.filename(caminho), '.', 1)
      and m.user_id = auth.uid()
  );
$$;

-- catálogo novo: {mestre_id}/{itens|cartas}/...
create function public.pode_ver_catalogo(caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select (storage.foldername(caminho))[2] in ('itens', 'cartas')
     and joga_com(((storage.foldername(caminho))[1])::uuid);
$$;

grant execute on function public.pode_ver_retrato(text), public.pode_ver_catalogo(text) to authenticated;

create policy "ver retratos de outras mesas" on storage.objects for select to authenticated
  using (bucket_id = 'imagens' and pode_ver_retrato(name));

create policy "ver catalogo do mestre" on storage.objects for select to authenticated
  using (bucket_id = 'imagens' and pode_ver_catalogo(name));

create policy "mestre envia o proprio catalogo" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] in ('itens', 'cartas')
  );

create policy "mestre troca o proprio catalogo" on storage.objects for update to authenticated
  using (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] in ('itens', 'cartas')
  );

create policy "mestre apaga o proprio catalogo" on storage.objects for delete to authenticated
  using (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] in ('itens', 'cartas')
  );

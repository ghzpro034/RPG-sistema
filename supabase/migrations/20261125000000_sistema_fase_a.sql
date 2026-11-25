-- Sistema novo (Compêndio), Fase A: a ficha. Ver docs/SISTEMA.md.
--   * Força vira Vigor; nova especialização Criar (Mental)
--   * Vigor, Mental e Social viram números da ficha (o mestre digita; a fórmula ainda não existe)
--   * D100 rola na característica (empate = sucesso); D20 rola na especialização, soma o bônus e o mestre julga
--   * limiar de Instável e limite de congelamento por ficha; Sinergia; raça
-- Rode inteiro no SQL Editor. As fichas que já existem são convertidas sem perder nada.

-- ========== ESPECIALIZAÇÕES ==========
-- o grupo "forca" passa a se chamar "vigor"
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.atributos'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%grupo%'
  loop
    execute format('alter table public.atributos drop constraint %I', c);
  end loop;
end $$;
update public.atributos set grupo = 'vigor' where grupo = 'forca';
alter table public.atributos add constraint atributos_grupo_check check (grupo in ('vigor', 'mental', 'social'));

-- bônus fixo no D20 daquela especialização (ex.: +2 do arquétipo)
alter table public.atributos add column bonus int not null default 0 check (bonus between -20 and 20);

-- Criar entra em Mental nas fichas que ainda não têm
insert into public.atributos (personagem_id, grupo, nome, valor, ordem)
select p.id, 'mental', 'Criar', 0, 5 from public.personagens p
where not exists (select 1 from public.atributos a where a.personagem_id = p.id and a.nome = 'Criar');

create or replace function public.nova_ficha_atributos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into atributos (personagem_id, grupo, nome, valor, ordem) values
    (new.id,'vigor','Força',20,1),(new.id,'vigor','Movimento',20,2),
    (new.id,'vigor','Furtividade',20,3),(new.id,'vigor','Resistência',20,4),
    (new.id,'mental','Vasculhar',20,1),(new.id,'mental','Percepção',20,2),
    (new.id,'mental','Conhecimento',20,3),(new.id,'mental','Atirar',20,4),
    (new.id,'mental','Criar',20,5),
    (new.id,'social','Lábia',20,1),(new.id,'social','Intimidação',20,2),
    (new.id,'social','Adestramento',20,3),(new.id,'social','Sorte',20,4),
    (new.id,'social','Presença',20,5);
  return new;
end $$;

-- ========== FICHA ==========
alter table public.personagens
  add column vigor int not null default 20 check (vigor between 0 and 100),
  add column mental int not null default 20 check (mental between 0 and 100),
  add column social int not null default 20 check (social between 0 and 100),
  add column limiar_instavel int not null default 5 check (limiar_instavel >= 0),
  add column limite_congelado int not null default 10 check (limite_congelado >= 0),
  add column sinergia int not null default 0 check (sinergia >= 0),
  add column raca text check (raca in ('errante', 'palido', 'sanguineo'));

-- ponto de partida das características: a média das especializações (o mestre ajusta depois).
-- Os triggers ficam desligados só aqui, para converter também as fichas do memorial e não encher o histórico.
alter table public.personagens disable trigger user;
update public.personagens p set
  vigor  = coalesce((select round(avg(valor))::int from atributos a where a.personagem_id = p.id and a.grupo = 'vigor'), 20),
  mental = coalesce((select round(avg(valor))::int from atributos a where a.personagem_id = p.id and a.grupo = 'mental' and a.nome <> 'Criar'), 20),
  social = coalesce((select round(avg(valor))::int from atributos a where a.personagem_id = p.id and a.grupo = 'social'), 20);
alter table public.personagens enable trigger user;

-- travas: características seguem a trava "atributos"; limites e raça são só do mestre
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
    if coalesce((old.travas->>'atributos')::boolean, true)
       and (new.vigor, new.mental, new.social) is distinct from (old.vigor, old.mental, old.social) then
      raise exception 'Características travadas pelo mestre';
    end if;
    if (new.limiar_instavel, new.limite_congelado, new.raca)
       is distinct from (old.limiar_instavel, old.limite_congelado, old.raca) then
      raise exception 'Só o mestre altera os limites e a raça';
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
  end if;
  return new;
end $$;

-- ========== ROLAGENS ==========
alter table public.rolagens add column dado text not null default 'd100' check (dado in ('d100', 'd20'));
alter table public.rolagens add column bonus int not null default 0;
-- no D20 quem julga é o mestre: sucesso fica vazio
alter table public.rolagens drop column sucesso;
alter table public.rolagens add column sucesso boolean
  generated always as (case when dado = 'd100' then resultado <= alvo end) stored;

-- joga n dados de f faces
create function public.jogar_dados(f int, n int) returns int[]
language sql volatile as $$
  select array_agg(1 + floor(random() * f)::int) from generate_series(1, n);
$$;

-- mesa onde a rolagem aparece: a aberta agora, se a ficha estiver nela; senão a de origem
create function public.mesa_da_rolagem(p personagens, p_campanha uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from mesa_personagens where campanha_id = p_campanha and personagem_id = p.id) then p_campanha
    else p.campanha_id
  end;
$$;

-- D100 numa característica (Vigor, Mental ou Social). Reforçar: 2 dados, vale o menor.
drop function public.rolar_d100(uuid, boolean, uuid);
create function public.rolar_d100(
  p_personagem uuid, p_caracteristica text, p_reforcar boolean default false, p_campanha uuid default null
) returns rolagens
language plpgsql security definer set search_path = public as $$
declare p personagens; r rolagens; d int[]; v_alvo int; v_nome text;
begin
  select * into p from personagens where id = p_personagem for update;
  if not found then raise exception 'Personagem não encontrado'; end if;
  if p.dono_id <> auth.uid() and not is_mestre_do_personagem(p.id) then raise exception 'Sem permissão'; end if;
  if p.morto_em is not null then raise exception 'Personagem morto não rola dado'; end if;
  case p_caracteristica
    when 'vigor' then v_alvo := p.vigor; v_nome := 'Vigor';
    when 'mental' then v_alvo := p.mental; v_nome := 'Mental';
    when 'social' then v_alvo := p.social; v_nome := 'Social';
    else raise exception 'Característica inválida';
  end case;
  if p_reforcar then
    if p.pe < 1 then raise exception 'PE insuficiente para reforçar'; end if;
    perform gastar_pe(p.id, 1);
  end if;

  d := jogar_dados(100, case when p_reforcar then 2 else 1 end);
  insert into rolagens (campanha_id, personagem_id, atributo, alvo, resultado, dados, reforcado, modificadores, dado)
  values (mesa_da_rolagem(p, p_campanha), p.id, v_nome, v_alvo, (select min(x) from unnest(d) x), d, p_reforcar,
          case when p_reforcar then array['Reforçado'] else '{}' end, 'd100')
  returning * into r;
  return r;
end $$;

-- D20 numa especialização: soma o bônus dela; o mestre julga contra a CD. Reforçar: 2 dados, vale o maior.
create function public.rolar_d20(p_atributo_id uuid, p_reforcar boolean default false, p_campanha uuid default null)
returns rolagens
language plpgsql security definer set search_path = public as $$
declare a atributos; p personagens; r rolagens; d int[];
begin
  select * into a from atributos where id = p_atributo_id;
  if not found then raise exception 'Especialização não encontrada'; end if;
  select * into p from personagens where id = a.personagem_id for update;
  if p.dono_id <> auth.uid() and not is_mestre_do_personagem(p.id) then raise exception 'Sem permissão'; end if;
  if p.morto_em is not null then raise exception 'Personagem morto não rola dado'; end if;
  if p_reforcar then
    if p.pe < 1 then raise exception 'PE insuficiente para reforçar'; end if;
    perform gastar_pe(p.id, 1);
  end if;

  d := jogar_dados(20, case when p_reforcar then 2 else 1 end);
  insert into rolagens (campanha_id, personagem_id, atributo, alvo, resultado, dados, reforcado, modificadores, dado, bonus)
  values (mesa_da_rolagem(p, p_campanha), p.id, a.nome, a.valor, (select max(x) from unnest(d) x), d, p_reforcar,
          case when p_reforcar then array['Reforçado'] else '{}' end, 'd20', a.bonus)
  returning * into r;
  return r;
end $$;

-- Refazer (−2 PE): rola de novo no mesmo dado e no mesmo modo
create or replace function public.refazer(p_rolagem_id uuid) returns rolagens
language plpgsql security definer set search_path = public as $$
declare r rolagens; p personagens; d int[];
begin
  select * into r from rolagens where id = p_rolagem_id for update;
  if not found then raise exception 'Rolagem não encontrada'; end if;
  select * into p from personagens where id = r.personagem_id for update;
  if p.dono_id <> auth.uid() and not is_mestre_do_personagem(p.id) then raise exception 'Sem permissão'; end if;
  if p.morto_em is not null then raise exception 'Personagem morto não rola dado'; end if;
  if p.pe < 2 then raise exception 'PE insuficiente para refazer'; end if;
  perform gastar_pe(p.id, 2);

  d := jogar_dados(case when r.dado = 'd20' then 20 else 100 end, case when r.reforcado then 2 else 1 end);
  update rolagens
     set dados = d,
         resultado = case when r.dado = 'd20' then (select max(x) from unnest(d) x) else (select min(x) from unnest(d) x) end,
         refeitos = refeitos + 1,
         modificadores = case when 'Refeito' = any(modificadores) then modificadores
                              else array_append(modificadores, 'Refeito') end
   where id = r.id
  returning * into r;
  return r;
end $$;

revoke execute on function public.jogar_dados(int, int), public.mesa_da_rolagem(personagens, uuid)
  from public, anon, authenticated;
revoke execute on function public.rolar_d100(uuid, text, boolean, uuid), public.rolar_d20(uuid, boolean, uuid),
  public.refazer(uuid) from public, anon;
grant execute on function public.rolar_d100(uuid, text, boolean, uuid), public.rolar_d20(uuid, boolean, uuid),
  public.refazer(uuid) to authenticated;

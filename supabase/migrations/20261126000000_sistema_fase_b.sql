-- Sistema novo (Compêndio), Fase B: as cartas. Ver docs/SISTEMA.md, seções 7 a 10.
--   * tipos de carta: arquétipo, trauma, habilidade (única) e caminho (antes "revolta")
--   * custos numéricos em PE e em Sinergia; Caminho (Amor/Revolta/Absurdo) e nível nas cartas de caminho
--   * arte embutida no app (coluna arte → /cartas/{arte}.webp) quando a carta não tem imagem enviada
--   * os 12 arquétipos e os 7 traumas do Compêndio entram no catálogo de cada mestre
--   * usar_carta: paga o custo (PE e/ou Sinergia) e avisa a Mesa ao vivo (tabela usos_carta)
--   * até 3 arquétipos e 1 habilidade única por personagem
--   * o Caminho da ficha vira Amor, Revolta ou Absurdo, e só o mestre muda

-- ========== CARTAS ==========
alter table public.cartas add column caminho text check (caminho in ('amor', 'revolta', 'absurdo'));
alter table public.cartas add column nivel text;
alter table public.cartas add column custo_pe int not null default 0 check (custo_pe between 0 and 50);
alter table public.cartas add column custo_sinergia int not null default 0 check (custo_sinergia between 0 and 50);
alter table public.cartas add column arte text check (arte ~ '^[a-z0-9-]+$');

-- "revolta" vira uma carta de caminho (o Caminho da Revolta)
do $$
declare r record;
begin
  for r in select conname from pg_constraint
           where conrelid = 'public.cartas'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%tipo%'
  loop
    execute format('alter table public.cartas drop constraint %I', r.conname);
  end loop;
end $$;
update public.cartas set tipo = 'caminho', caminho = 'revolta' where tipo = 'revolta';
alter table public.cartas add constraint cartas_tipo_check
  check (tipo in ('arquetipo', 'trauma', 'habilidade', 'caminho'));

-- o custo era texto livre ("1 Ponto de Sinergia", "5 PE"): vira número quando dá para ler
update public.cartas set
  custo_sinergia = coalesce((substring(custo from '(\d+)'))::int, 0),
  custo = null
where custo ~* '\d' and custo ~* 'sinerg';
update public.cartas set
  custo_pe = coalesce((substring(custo from '(\d+)'))::int, 0),
  custo = null
where custo ~* '\d' and custo ~* '(\mpe\M|esfor)';

-- ========== AS CARTAS DO COMPÊNDIO ==========
-- nome, tipo, arte, efeitos e custo em PE (traumas: 5)
create function public.cartas_do_compendio()
returns table (nome text, tipo text, arte text, efeitos text[], custo_pe int)
language sql immutable as $$
  values
    ('O Inocente', 'arquetipo', 'arquetipo-inocente', array[
      'Passiva: defender um aliado dá +2 PE.',
      'Ativa: o custo do Trauma cai 1 PE para cada aliado Instável.'], 0),
    ('O Explorador', 'arquetipo', 'arquetipo-explorador', array[
      'Passiva: +2 no D20 de Vasculhar e de Percepção.',
      'Ativa: exige que o mestre revele os pontos de interesse e as rotas do ambiente.'], 0),
    ('O Bobo da Corte', 'arquetipo', 'arquetipo-bobo-da-corte', array[
      'Passiva: +2 no D20 de Sorte.',
      'Ativa: anula todo desastre automático (falha crítica letal) contra ele.'], 0),
    ('O Sábio', 'arquetipo', 'arquetipo-sabio', array[
      'Passiva: +1 tipo de Conhecimento.',
      'Ativa (1 PE): uma dica direta do mestre ou a validação das Vozes (verdadeiro ou falso).'], 1),
    ('O Mágico', 'arquetipo', 'arquetipo-magico', array[
      'Passiva: ao ganhar Corrupção, 50% de chance de anular.',
      'Ativa: anula o efeito colateral da Graça em si.'], 0),
    ('O Rebelde', 'arquetipo', 'arquetipo-rebelde', array[
      'Passiva: +2 no D20 de Sorte.',
      'Ativa: muda de grupo como ação secundária (1 vez por combate).'], 0),
    ('O Amante', 'arquetipo', 'arquetipo-amante', array[
      'Passiva: +15 fixos em Social.',
      'Ativa: novo teste de Sinergia com um 2º aliado se o 1º falhar.'], 0),
    ('O Criador', 'arquetipo', 'arquetipo-criador', array[
      'Passiva: +2 no D20 de Criar.',
      'Ativa: o Refazer de criação ou de vasculhar rola com vantagem.'], 0),
    ('O Cuidador', 'arquetipo', 'arquetipo-cuidador', array[
      'Passiva: vê os números de Vida e o estado de todos.',
      'Ativa: curar um aliado dá +5 de cura e devolve +2 PE.'], 0),
    ('O Órfão', 'arquetipo', 'arquetipo-orfao', array[
      'Passiva: +2 no D20 de Resistência.',
      'Ativa: ignora as restrições do estado Ferido.'], 0),
    ('A Régua', 'arquetipo', 'arquetipo-regua', array[
      'Passiva: imune a intimidação contra a sua vontade.',
      'Ativa: define a CD de Sinergia do grupo (o número de tentativas).'], 0),
    ('O Herói', 'arquetipo', 'arquetipo-heroi', array[
      'Passiva: sempre age primeiro no seu grupo.',
      'Ativa: +5 de dano no primeiro ataque bem-sucedido do combate.'], 0),
    ('Traição', 'trauma', 'trauma-traicao', array[
      'Transfere um dano fatal para 2 aliados (ficam Instáveis) e cura o usuário ao máximo.',
      'Preço: os aliados perdem 2 PE máximos até descansar e quebram a Sinergia com o usuário.'], 5),
    ('Injustiça', 'trauma', 'trauma-injustica', array[
      'Vantagem e acerto automático em todos os testes até o fim do combate.',
      'Preço: todos os outros ganham desvantagem; o congelamento e a corrupção da arena aceleram.'], 5),
    ('Abandono', 'trauma', 'trauma-abandono', array[
      'Todo o dano sofrido vai para 1 aliado (sem armadura). Se ele viver, o dano vira cura para o usuário.',
      'Preço: se o aliado chegar a 0 por isso, o usuário ganha +1 de Corrupção permanente.'], 5),
    ('Tragédia', 'trauma', 'trauma-tragedia', array[
      'Drena a Vida dos aliados Estáveis (até Ferido) para um ataque com a soma.',
      'Preço: se o inimigo morrer, 50% volta em cura; se sobreviver, o usuário sofre 50% do dreno.'], 5),
    ('Rigidez', 'trauma', 'trauma-rigidez', array[
      'Por 2 rodadas ninguém faz Ataque Comum, Fugir ou Troca de Grupo. O usuário tem Defender livre, vantagem geral e sucesso automático em Resistência.',
      'Preço: fica imóvel; ao fim perde a armadura e a Vida cai para 1 (Instável).'], 5),
    ('Rejeição', 'trauma', 'trauma-rejeicao', array[
      'Arrasta um inimigo para uma Briga 1v1 com vantagem em tudo.',
      'Preço: ganhe ou perca, a Vida cai para 1 e o usuário fica incapacitado até o fim do combate.'], 5),
    ('Humilhação', 'trauma', 'trauma-humilhacao', array[
      'Marca 1 inimigo: armadura 0 e desvantagem geral.',
      'Preço: todo dano que ele sofre "espirra" dividido entre os aliados do usuário.'], 5);
$$;

-- coloca as cartas do Compêndio no catálogo de um mestre. A que já existe com o mesmo nome (ou "Trauma de X")
-- ganha a arte, o custo e o texto do Compêndio; a citação e a imagem enviada ficam.
create function public.semear_cartas_do_compendio(p_mestre uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c record; existente uuid;
begin
  for c in select * from cartas_do_compendio() loop
    select k.id into existente from cartas k
    where k.mestre_id = p_mestre and k.tipo = c.tipo
      and lower(k.nome) in (lower(c.nome), lower('Trauma de ' || c.nome), lower('Trauma da ' || c.nome))
    limit 1;
    if existente is null then
      insert into cartas (mestre_id, tipo, nome, efeitos, custo_pe, arte)
      values (p_mestre, c.tipo, c.nome, c.efeitos, c.custo_pe, c.arte);
    else
      update cartas set arte = c.arte, efeitos = c.efeitos, custo_pe = c.custo_pe, custo = null
      where id = existente;
    end if;
  end loop;
end $$;

-- cada mestre que já existe recebe as cartas agora; quem criar a primeira mesa depois, recebe ao criar
do $$
declare m uuid;
begin
  for m in select distinct mestre_id from campanhas loop
    perform semear_cartas_do_compendio(m);
  end loop;
end $$;

create function public.semear_cartas_da_mesa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from cartas where mestre_id = new.mestre_id and arte is not null) then
    perform semear_cartas_do_compendio(new.mestre_id);
  end if;
  return new;
end $$;

create trigger semear_cartas_da_mesa after insert on public.campanhas
for each row execute function public.semear_cartas_da_mesa();

-- ========== LIMITES DO BARALHO ==========
-- Compêndio: até 3 arquétipos; uma habilidade única por personagem
create function public.limite_do_baralho() returns trigger
language plpgsql set search_path = public as $$
declare v_tipo text; total int;
begin
  select tipo into v_tipo from cartas where id = new.carta_id;
  select count(*) into total from personagem_cartas pc join cartas k on k.id = pc.carta_id
  where pc.personagem_id = new.personagem_id and k.tipo = v_tipo;
  if v_tipo = 'arquetipo' and total >= 3 then
    raise exception 'O personagem já tem 3 arquétipos';
  end if;
  if v_tipo = 'habilidade' and total >= 1 then
    raise exception 'O personagem já tem uma habilidade única';
  end if;
  return new;
end $$;

create trigger limite_do_baralho before insert on public.personagem_cartas
for each row execute function public.limite_do_baralho();

-- ========== CAMINHO DA FICHA ==========
alter table public.personagens alter column caminho drop default;
alter table public.personagens disable trigger user;
update public.personagens set caminho = case
  when caminho ilike '%amor%' then 'amor'
  when caminho ilike '%revolta%' then 'revolta'
  when caminho ilike '%absurdo%' then 'absurdo'
end;
alter table public.personagens enable trigger user;
alter table public.personagens add constraint personagens_caminho_check
  check (caminho in ('amor', 'revolta', 'absurdo'));

-- o Caminho se aprende com quem já o tem: só o mestre muda (junto com os limites e a raça)
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
    if old.enganou_morte and not new.enganou_morte then
      raise exception 'Só o mestre devolve o Enganar a morte';
    end if;
  end if;
  new.vida := least(new.vida, new.vida_max);
  new.pe := least(new.pe, new.pe_max);
  new.updated_at := now();
  return new;
end $$;

-- ========== USAR UMA CARTA ==========
-- registro para a Mesa ao vivo (como as rolagens): quem usou, qual carta e quanto pagou
create table public.usos_carta (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.campanhas on delete cascade,
  personagem_id uuid not null references public.personagens on delete cascade,
  carta_id uuid references public.cartas on delete set null,
  autor_id uuid references public.profiles default auth.uid(),
  nome text not null,
  tipo text not null,
  custo_pe int not null default 0,
  custo_sinergia int not null default 0,
  created_at timestamptz default now()
);
create index usos_carta_campanha on public.usos_carta (campanha_id, created_at desc);
alter table public.usos_carta enable row level security;
create policy "ler usos de carta" on public.usos_carta for select
  using (is_mestre(campanha_id) or pode_editar_ficha(personagem_id));
revoke insert, update, delete on public.usos_carta from anon, authenticated;
alter publication supabase_realtime add table public.usos_carta;

-- paga o custo da carta (PE e/ou Sinergia) e avisa a Mesa
create function public.usar_carta(p_personagem uuid, p_carta uuid, p_campanha uuid default null)
returns usos_carta
language plpgsql security definer set search_path = public as $$
declare p personagens; k cartas; u usos_carta;
begin
  select * into p from personagens where id = p_personagem for update;
  if not found then raise exception 'Personagem não encontrado'; end if;
  if p.dono_id <> auth.uid() and not is_mestre_do_personagem(p.id) then raise exception 'Sem permissão'; end if;
  if p.morto_em is not null then raise exception 'Personagem morto não usa cartas'; end if;
  select k2.* into k from cartas k2 join personagem_cartas pc on pc.carta_id = k2.id
  where pc.personagem_id = p.id and k2.id = p_carta;
  if not found then raise exception 'Essa carta não está no baralho do personagem'; end if;
  if k.custo_pe = 0 and k.custo_sinergia = 0 then raise exception 'Essa carta não tem custo para pagar'; end if;
  if p.pe < k.custo_pe then raise exception 'PE insuficiente (precisa de %)', k.custo_pe; end if;
  if p.sinergia < k.custo_sinergia then raise exception 'Sinergia insuficiente (precisa de %)', k.custo_sinergia; end if;

  perform set_config('grimorio.rpc', 'on', true);
  update personagens set pe = pe - k.custo_pe, sinergia = sinergia - k.custo_sinergia where id = p.id;
  perform set_config('grimorio.rpc', '', true);

  insert into usos_carta (campanha_id, personagem_id, carta_id, nome, tipo, custo_pe, custo_sinergia)
  values (mesa_da_rolagem(p, p_campanha), p.id, k.id, k.nome, k.tipo, k.custo_pe, k.custo_sinergia)
  returning * into u;
  return u;
end $$;

revoke execute on function public.cartas_do_compendio(), public.semear_cartas_do_compendio(uuid),
  public.semear_cartas_da_mesa(), public.limite_do_baralho() from public, anon, authenticated;
revoke execute on function public.usar_carta(uuid, uuid, uuid) from public, anon;
grant execute on function public.usar_carta(uuid, uuid, uuid) to authenticated;

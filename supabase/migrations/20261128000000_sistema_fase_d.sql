-- Sistema novo (Compêndio), Fase D: o combate. Ver docs/SISTEMA.md, seções 5 e 6.
--   * Grupos A e B por mesa (mesa_personagens.grupo); O Herói age primeiro no seu grupo
--   * combate da mesa: ativo, rodada e vez (campanhas); a sequência Inimigo → A → Inimigo → B sai do banco
--   * tiro: D8 (1 cabeça/crítico … 7-8 erro) ou D6 (atirador focado/arma avançada, sem erro)
--   * dano: rola o dado do item ("2D10", "D15"), normal, com desvantagem (perna) ou crítico (máximo)
--   * Recuperar Foco: +2 PE, só Estável (O Órfão também quando Ferido); aparece na Mesa
--   * aplicar_dano (mestre): Defender corta pela metade, a Proteção desconta, Instável vai a 0

-- ========== GRUPOS E COMBATE ==========
alter table public.mesa_personagens add column grupo text check (grupo in ('a', 'b'));
alter table public.mesa_personagens add column grupo_ordem int not null default 0;

alter table public.campanhas add column em_combate boolean not null default false;
alter table public.campanhas add column combate_rodada int not null default 1 check (combate_rodada >= 1);
alter table public.campanhas add column combate_vez int not null default 0 check (combate_vez >= 0);
-- jogadores acompanham a vez ao vivo
alter publication supabase_realtime add table public.campanhas;

-- quem tem O Herói (passiva: sempre age primeiro no seu grupo)
create function public.tem_carta_arte(p_personagem uuid, p_arte text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from personagem_cartas pc join cartas c on c.id = pc.carta_id
    where pc.personagem_id = p_personagem and c.arte = p_arte
  );
$$;

-- a ordem do combate: Inimigo, 1º do A, Inimigo, 1º do B, Inimigo, 2º do A… (personagem_id nulo = vez do inimigo)
create function public.sequencia_do_combate(p_campanha uuid)
returns table (posicao int, personagem_id uuid, nome text, grupo text)
language sql stable security definer set search_path = public as $$
  with vivos as (
    select mp.personagem_id, mp.grupo, p.nome,
           row_number() over (
             partition by mp.grupo
             order by tem_carta_arte(p.id, 'arquetipo-heroi') desc, mp.grupo_ordem, p.nome
           ) as n
    from mesa_personagens mp join personagens p on p.id = mp.personagem_id
    where mp.campanha_id = p_campanha and mp.grupo is not null and p.morto_em is null
      and is_membro(p_campanha)
  )
  select (row_number() over (order by v.n, v.grupo, s.sub) - 1)::int,
         case s.sub when 0 then null else v.personagem_id end,
         case s.sub when 0 then 'Inimigo' else v.nome end,
         v.grupo
  from vivos v cross join (values (0), (1)) s(sub)
  order by 1;
$$;

-- tudo o que a Mesa e a ficha mostram do combate, de uma vez
create function public.estado_do_combate(p_campanha uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'em_combate', c.em_combate,
    'rodada', c.combate_rodada,
    'vez', c.combate_vez,
    'sequencia', coalesce((
      select jsonb_agg(jsonb_build_object('posicao', s.posicao, 'personagem_id', s.personagem_id,
                                          'nome', s.nome, 'grupo', s.grupo) order by s.posicao)
      from sequencia_do_combate(c.id) s
    ), '[]'::jsonb),
    'grupos', coalesce((
      select jsonb_object_agg(mp.personagem_id, mp.grupo)
      from mesa_personagens mp where mp.campanha_id = c.id and mp.grupo is not null
    ), '{}'::jsonb)
  )
  from campanhas c where c.id = p_campanha and is_membro(p_campanha);
$$;

-- mestre: começa ou encerra o combate (sempre na rodada 1, vez do inimigo)
create function public.definir_combate(p_campanha uuid, p_ativo boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_mestre(p_campanha) then raise exception 'Só o mestre conduz o combate'; end if;
  update campanhas set em_combate = p_ativo, combate_rodada = 1, combate_vez = 0 where id = p_campanha;
end $$;

-- mestre: passa a vez; no fim da sequência começa a rodada seguinte
create function public.avancar_vez(p_campanha uuid, p_passos int default 1) returns void
language plpgsql security definer set search_path = public as $$
declare total int; c campanhas; nova int;
begin
  if not is_mestre(p_campanha) then raise exception 'Só o mestre conduz o combate'; end if;
  select * into c from campanhas where id = p_campanha for update;
  if not c.em_combate then raise exception 'A mesa não está em combate'; end if;
  select count(*) into total from sequencia_do_combate(p_campanha);
  if total = 0 then raise exception 'Coloque os personagens nos Grupos A e B primeiro'; end if;
  nova := c.combate_vez + p_passos;
  if nova >= total then
    update campanhas set combate_vez = 0, combate_rodada = combate_rodada + 1 where id = p_campanha;
  elsif nova < 0 then
    update campanhas set combate_vez = total - 1, combate_rodada = greatest(1, combate_rodada - 1) where id = p_campanha;
  else
    update campanhas set combate_vez = nova where id = p_campanha;
  end if;
end $$;

-- mestre: põe o personagem no Grupo A, no B ou fora (nulo); entra no fim do grupo
create function public.definir_grupo(p_campanha uuid, p_personagem uuid, p_grupo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_mestre(p_campanha) then raise exception 'Só o mestre muda os grupos'; end if;
  if p_grupo is not null and p_grupo not in ('a', 'b') then raise exception 'Grupo inválido'; end if;
  update mesa_personagens set
    grupo = p_grupo,
    grupo_ordem = coalesce((select max(grupo_ordem) + 1 from mesa_personagens
                            where campanha_id = p_campanha and grupo = p_grupo), 0)
  where campanha_id = p_campanha and personagem_id = p_personagem;
  if not found then raise exception 'Personagem não está nesta mesa'; end if;
end $$;

-- ========== DADOS DE COMBATE ==========
-- rolagens passam a guardar também o tiro e o dano (o dano pode passar de 100)
do $$
declare r record;
begin
  for r in select conname from pg_constraint
           where conrelid = 'public.rolagens'::regclass and contype = 'c'
             and (pg_get_constraintdef(oid) ilike '%resultado%' or pg_get_constraintdef(oid) ilike '%dado%')
  loop
    execute format('alter table public.rolagens drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.rolagens add constraint rolagens_dado_check check (dado in ('d100', 'd20', 'tiro', 'dano'));
alter table public.rolagens add constraint rolagens_resultado_check check (resultado >= 0);

-- quem pode rolar por este personagem (o dono ou o mestre), vivo
create function public.personagem_que_rola(p_personagem uuid) returns personagens
language plpgsql security definer set search_path = public as $$
declare p personagens;
begin
  select * into p from personagens where id = p_personagem for update;
  if not found then raise exception 'Personagem não encontrado'; end if;
  if p.dono_id <> auth.uid() and not is_mestre_do_personagem(p.id) then raise exception 'Sem permissão'; end if;
  if p.morto_em is not null then raise exception 'Personagem morto não rola dado'; end if;
  return p;
end $$;

-- tiro: D8 (pode errar) ou D6 (atirador focado / arma avançada). alvo guarda as faces, para o Refazer.
create function public.rolar_tiro(p_personagem uuid, p_d6 boolean default false, p_campanha uuid default null)
returns rolagens
language plpgsql security definer set search_path = public as $$
declare p personagens; r rolagens; faces int := case when p_d6 then 6 else 8 end; d int[];
begin
  p := personagem_que_rola(p_personagem);
  d := jogar_dados(faces, 1);
  insert into rolagens (campanha_id, personagem_id, atributo, alvo, resultado, dados, dado, modificadores)
  values (mesa_da_rolagem(p, p_campanha), p.id, 'Tiro', faces, d[1], d, 'tiro',
          case when p_d6 then array['D6'] else '{}' end)
  returning * into r;
  return r;
end $$;

-- dano do item: "2D10", "D15", "D10+3". Desvantagem (perna): rola duas vezes, vale o menor. Crítico (cabeça): máximo.
create function public.rolar_dano(p_inventario uuid, p_modo text default 'normal', p_campanha uuid default null)
returns rolagens
language plpgsql security definer set search_path = public as $$
declare
  p personagens; v_dono uuid; it itens; partes text[]; qtd int; faces int; extra int;
  a int[]; b int[]; d int[]; total int; r rolagens;
begin
  if p_modo not in ('normal', 'desvantagem', 'critico') then raise exception 'Modo de dano inválido'; end if;
  select i.* into it from itens i join inventario inv on inv.item_id = i.id where inv.id = p_inventario;
  if not found then raise exception 'Item não encontrado'; end if;
  select inv.personagem_id into v_dono from inventario inv where inv.id = p_inventario;
  p := personagem_que_rola(v_dono);

  partes := regexp_match(coalesce(it.dano, ''), '^\s*(\d*)\s*[dD]\s*(\d+)\s*(?:\+\s*(\d+))?\s*$');
  if partes is null then raise exception 'O dano de % não é um dado (ex.: 2D10)', it.nome; end if;
  qtd := coalesce(nullif(partes[1], '')::int, 1);
  faces := partes[2]::int;
  extra := coalesce(partes[3]::int, 0);
  if qtd not between 1 and 20 or faces not between 2 and 100 then raise exception 'Dado de dano fora do limite'; end if;

  if p_modo = 'critico' then
    d := array_fill(faces, array[qtd]);
  else
    a := jogar_dados(faces, qtd);
    d := a;
    if p_modo = 'desvantagem' then
      b := jogar_dados(faces, qtd);
      if (select sum(x) from unnest(b) x) < (select sum(x) from unnest(a) x) then d := b; end if;
    end if;
  end if;
  total := (select sum(x) from unnest(d) x) + extra;

  insert into rolagens (campanha_id, personagem_id, atributo, alvo, resultado, dados, dado, bonus, modificadores)
  values (mesa_da_rolagem(p, p_campanha), p.id, it.nome, faces, total, d, 'dano', extra,
          case p_modo when 'critico' then array['Crítico'] when 'desvantagem' then array['Desvantagem'] else '{}' end)
  returning * into r;
  return r;
end $$;

-- Refazer (2 PE) vale para os testes e para o tiro; o dano não se refaz
create or replace function public.refazer(p_rolagem_id uuid) returns rolagens
language plpgsql security definer set search_path = public as $$
declare r rolagens; p personagens; d int[]; faces int;
begin
  select * into r from rolagens where id = p_rolagem_id for update;
  if not found then raise exception 'Rolagem não encontrada'; end if;
  if r.dado = 'dano' then raise exception 'O dano não se refaz'; end if;
  p := personagem_que_rola(r.personagem_id);
  if p.pe < 2 then raise exception 'PE insuficiente para refazer'; end if;
  perform gastar_pe(p.id, 2);

  faces := case r.dado when 'd20' then 20 when 'tiro' then r.alvo else 100 end;
  d := jogar_dados(faces, case when r.reforcado then 2 else 1 end);
  update rolagens
     set dados = d,
         resultado = case r.dado when 'd20' then (select max(x) from unnest(d) x)
                                 when 'tiro' then d[1]
                                 else (select min(x) from unnest(d) x) end,
         refeitos = refeitos + 1,
         modificadores = case when 'Refeito' = any(modificadores) then modificadores
                              else array_append(modificadores, 'Refeito') end
   where id = r.id
  returning * into r;
  return r;
end $$;

-- ========== RECUPERAR FOCO ==========
-- +2 PE. Compêndio: Ferido não recupera foco (O Órfão ignora as restrições de Ferido); Instável e Morrendo também não.
create function public.recuperar_foco(p_personagem uuid, p_campanha uuid default null) returns usos_carta
language plpgsql security definer set search_path = public as $$
declare p personagens; ganho int; u usos_carta;
begin
  p := personagem_que_rola(p_personagem);
  if p.vida <= 0 then raise exception 'Morrendo não age';
  elsif p.vida < p.limiar_instavel then raise exception 'Instável só faz ações simples: não recupera foco';
  elsif p.vida < ceil(p.vida_max / 2.0) and not tem_carta_arte(p.id, 'arquetipo-orfao') then
    raise exception 'Ferido não recupera foco';
  end if;
  ganho := least(2, p.pe_max - p.pe);
  if ganho <= 0 then raise exception 'O PE já está no máximo'; end if;

  perform set_config('grimorio.rpc', 'on', true);
  update personagens set pe = pe + ganho where id = p.id;
  perform set_config('grimorio.rpc', '', true);

  -- na Mesa, o ganho aparece como custo negativo
  insert into usos_carta (campanha_id, personagem_id, nome, tipo, custo_pe)
  values (mesa_da_rolagem(p, p_campanha), p.id, 'Recuperar Foco', 'acao', -ganho)
  returning * into u;
  return u;
end $$;

-- ========== APLICAR DANO (MESTRE) ==========
-- Defender (D20 de Resistência que passou) corta pela metade, para baixo; depois a Proteção desconta,
-- a não ser que esteja vulnerável (ex.: depois de Recuperar Foco). Instável: qualquer dano leva a Vida a 0.
-- Morrendo: não mexe na vida; o app avisa que é morte definitiva (o mestre registra pelo botão Morreu).
create function public.aplicar_dano(
  p_personagem uuid, p_dano int, p_defendeu boolean default false, p_vulneravel boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p personagens; final int; depois int;
begin
  if not is_mestre_do_personagem(p_personagem) then raise exception 'Só o mestre aplica dano'; end if;
  select * into p from personagens where id = p_personagem for update;
  if p.morto_em is not null then raise exception 'Personagem morto'; end if;
  if p_dano is null or p_dano < 1 then raise exception 'Dano inválido'; end if;
  if p.vida <= 0 then
    return jsonb_build_object('morrendo', true, 'antes', 0, 'depois', 0, 'final', 0);
  end if;

  final := case when p_defendeu then floor(p_dano / 2.0)::int else p_dano end;
  if not p_vulneravel then final := final - p.defesa; end if;
  final := greatest(0, final);
  depois := case
    when final > 0 and p.vida < p.limiar_instavel then 0
    else greatest(0, p.vida - final)
  end;
  update personagens set vida = depois where id = p.id;
  return jsonb_build_object('morrendo', false, 'antes', p.vida, 'depois', depois, 'final', final,
                            'instavel', p.vida < p.limiar_instavel, 'protecao', case when p_vulneravel then 0 else p.defesa end);
end $$;

-- ========== ACESSO ==========
revoke execute on function public.tem_carta_arte(uuid, text), public.personagem_que_rola(uuid),
  public.sequencia_do_combate(uuid) from public, anon, authenticated;
revoke execute on function public.estado_do_combate(uuid), public.definir_combate(uuid, boolean),
  public.avancar_vez(uuid, int), public.definir_grupo(uuid, uuid, text),
  public.rolar_tiro(uuid, boolean, uuid), public.rolar_dano(uuid, text, uuid), public.refazer(uuid),
  public.recuperar_foco(uuid, uuid), public.aplicar_dano(uuid, int, boolean, boolean) from public, anon;
grant execute on function public.estado_do_combate(uuid), public.definir_combate(uuid, boolean),
  public.avancar_vez(uuid, int), public.definir_grupo(uuid, uuid, text),
  public.rolar_tiro(uuid, boolean, uuid), public.rolar_dano(uuid, text, uuid), public.refazer(uuid),
  public.recuperar_foco(uuid, uuid), public.aplicar_dano(uuid, int, boolean, boolean) to authenticated;

-- Correções da auditoria da Mesa (27/11):
--   * a vez guarda DE QUEM é (combate_vez_de + combate_vez_inimigo), não só a posição: se alguém morre, troca de grupo
--     ou sai da mesa no meio do combate, a vez continua com a mesma pessoa (antes pulava para outra, ou saía da lista
--     e o "Voltar" avançava a rodada)
--   * "Começar combate" não zera um combate que já está em andamento
--   * quem morre sai do grupo de combate (as fichas dos outros recebem a ordem nova ao vivo)
--   * ajustar_vida: o −/+ da Mesa manda a diferença (vida = vida + delta), não o valor final, e não apaga um Dano

-- ========== DE QUEM É A VEZ ==========
alter table public.campanhas add column combate_vez_de uuid references public.personagens on delete set null;
alter table public.campanhas add column combate_vez_inimigo boolean not null default true;

-- a ordem ganha "par": o personagem dono daquele par de passos (o inimigo que vem antes dele e ele mesmo)
drop function public.sequencia_do_combate(uuid);
create function public.sequencia_do_combate(p_campanha uuid)
returns table (posicao int, personagem_id uuid, nome text, grupo text, par uuid)
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
         v.grupo,
         v.personagem_id
  from vivos v cross join (values (0), (1)) s(sub)
  order by 1;
$$;

-- a posição da vez na ordem de AGORA: procura a pessoa (ou o inimigo antes dela); se ela saiu da ordem,
-- fica na mesma posição de antes, limitada ao tamanho da ordem
create function public.vez_atual(p_campanha uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select s.posicao from sequencia_do_combate(c.id) s
      where s.par = c.combate_vez_de and (s.personagem_id is null) = c.combate_vez_inimigo),
    least(c.combate_vez, greatest((select count(*)::int from sequencia_do_combate(c.id)) - 1, 0))
  )
  from campanhas c where c.id = p_campanha;
$$;

-- guarda a vez numa posição (e de quem ela é)
create function public.marcar_vez(p_campanha uuid, p_posicao int) returns void
language plpgsql security definer set search_path = public as $$
declare passo record;
begin
  select * into passo from sequencia_do_combate(p_campanha) s where s.posicao = p_posicao;
  update campanhas set
    combate_vez = p_posicao,
    combate_vez_de = passo.par,
    combate_vez_inimigo = coalesce(passo.personagem_id is null, true)
  where id = p_campanha;
end $$;

create or replace function public.estado_do_combate(p_campanha uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'em_combate', c.em_combate,
    'rodada', c.combate_rodada,
    'vez', vez_atual(c.id),
    'sequencia', coalesce((
      select jsonb_agg(jsonb_build_object('posicao', s.posicao, 'personagem_id', s.personagem_id,
                                          'nome', s.nome, 'grupo', s.grupo) order by s.posicao)
      from sequencia_do_combate(c.id) s
    ), '[]'::jsonb),
    'grupos', coalesce((
      select jsonb_object_agg(mp.personagem_id, mp.grupo)
      from mesa_personagens mp join personagens p on p.id = mp.personagem_id
      where mp.campanha_id = c.id and mp.grupo is not null and p.morto_em is null
    ), '{}'::jsonb)
  )
  from campanhas c where c.id = p_campanha and is_membro(p_campanha);
$$;

-- começar: só zera se a mesa NÃO estava em combate (um clique depois de uma falha de conexão não perde a rodada)
create or replace function public.definir_combate(p_campanha uuid, p_ativo boolean) returns void
language plpgsql security definer set search_path = public as $$
declare ja boolean;
begin
  if not is_mestre(p_campanha) then raise exception 'Só o mestre conduz o combate'; end if;
  select em_combate into ja from campanhas where id = p_campanha for update;
  if p_ativo and ja then return; end if;
  update campanhas set em_combate = p_ativo, combate_rodada = 1 where id = p_campanha;
  perform marcar_vez(p_campanha, 0);
end $$;

-- passa a vez a partir de onde ela está AGORA; no fim da ordem começa a rodada seguinte
create or replace function public.avancar_vez(p_campanha uuid, p_passos int default 1) returns void
language plpgsql security definer set search_path = public as $$
declare total int; c campanhas; atual int; nova int;
begin
  if not is_mestre(p_campanha) then raise exception 'Só o mestre conduz o combate'; end if;
  select * into c from campanhas where id = p_campanha for update;
  if not c.em_combate then raise exception 'A mesa não está em combate'; end if;
  select count(*) into total from sequencia_do_combate(p_campanha);
  if total = 0 then raise exception 'Coloque os personagens nos Grupos A e B primeiro'; end if;
  atual := vez_atual(p_campanha);
  nova := atual + p_passos;
  if nova >= total then
    update campanhas set combate_rodada = combate_rodada + 1 where id = p_campanha;
    nova := 0;
  elsif nova < 0 then
    update campanhas set combate_rodada = greatest(1, combate_rodada - 1) where id = p_campanha;
    nova := total - 1;
  end if;
  perform marcar_vez(p_campanha, nova);
end $$;

-- quem já tinha combate em andamento: a vez guardada passa a ter dono
do $$
declare c record;
begin
  for c in select id from campanhas where em_combate loop
    perform marcar_vez(c.id, vez_atual(c.id));
  end loop;
end $$;

-- ========== MORTE SAI DO GRUPO ==========
-- o UPDATE em mesa_personagens avisa ao vivo as fichas dos outros (a ordem muda); a vez fica com quem já estava
create function public.morte_sai_do_combate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.morto_em is not null and old.morto_em is null then
    update mesa_personagens set grupo = null where personagem_id = new.id and grupo is not null;
  end if;
  return new;
end $$;
create trigger morte_sai_do_combate after update of morto_em on public.personagens
for each row execute function public.morte_sai_do_combate();

-- ========== VIDA POR DIFERENÇA ==========
-- o −/+ da Mesa soma à vida que está no banco (não grava um valor velho por cima de um Dano). Segue o RLS
-- e as travas de quem chama (security invoker).
create function public.ajustar_vida(p_personagem uuid, p_delta int) returns int
language sql security invoker set search_path = public as $$
  update personagens set vida = greatest(0, least(vida_max, vida + p_delta))
  where id = p_personagem
  returning vida;
$$;

revoke execute on function public.vez_atual(uuid), public.marcar_vez(uuid, int), public.sequencia_do_combate(uuid),
  public.morte_sai_do_combate() from public, anon, authenticated;
revoke execute on function public.ajustar_vida(uuid, int) from public, anon;
grant execute on function public.ajustar_vida(uuid, int) to authenticated;

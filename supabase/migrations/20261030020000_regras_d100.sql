-- Regras do D100 confirmadas pela mesa:
--   * empate conta como sucesso (resultado <= atributo)
--   * Reforçar (−1 PE): rola 2 dados ao mesmo tempo e vale o melhor (o menor); declarado antes de rolar
--   * Refazer (−2 PE): rola de novo no mesmo modo, sem limite, enquanto houver PE

alter table public.rolagens drop column sucesso;
alter table public.rolagens add column sucesso boolean generated always as (resultado <= alvo) stored;
-- os dados que saíram na última jogada (1 ou 2)
alter table public.rolagens add column dados int[] not null default '{}';
alter table public.rolagens add column reforcado boolean not null default false;
alter table public.rolagens add column refeitos int not null default 0;

drop function public.reforcar(uuid);
drop function public.rolar_d100(uuid);

-- joga n dados de 100 faces
create function public.jogar_d100(n int) returns int[]
language sql volatile as $$
  select array_agg(1 + floor(random() * 100)::int) from generate_series(1, n);
$$;

-- gasta PE pela RPC (os triggers só deixam o player mexer no PE com essa flag)
create function public.gastar_pe(p_personagem uuid, p_custo int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('grimorio.rpc', 'on', true);
  update personagens set pe = pe - p_custo where id = p_personagem;
  perform set_config('grimorio.rpc', '', true);
end $$;

-- rolar o D100 no servidor (ninguém forja o resultado); com p_reforcar, 2 dados e vale o menor
create function public.rolar_d100(p_atributo_id uuid, p_reforcar boolean default false) returns rolagens
language plpgsql security definer set search_path = public as $$
declare a atributos; p personagens; r rolagens; d int[];
begin
  select * into a from atributos where id = p_atributo_id;
  if not found then raise exception 'Atributo não encontrado'; end if;
  select * into p from personagens where id = a.personagem_id for update;
  if p.dono_id <> auth.uid() and not is_mestre(p.campanha_id) then
    raise exception 'Sem permissão';
  end if;
  if p_reforcar then
    if p.pe < 1 then raise exception 'PE insuficiente para reforçar'; end if;
    perform gastar_pe(p.id, 1);
  end if;

  d := jogar_d100(case when p_reforcar then 2 else 1 end);
  insert into rolagens (campanha_id, personagem_id, atributo, alvo, resultado, dados, reforcado, modificadores)
  values (p.campanha_id, p.id, a.nome, a.valor,
          (select min(x) from unnest(d) x), d, p_reforcar,
          case when p_reforcar then array['Reforçado'] else '{}' end)
  returning * into r;
  return r;
end $$;

-- Refazer: −2 PE, rola de novo no mesmo modo da rolagem original
create or replace function public.refazer(p_rolagem_id uuid) returns rolagens
language plpgsql security definer set search_path = public as $$
declare r rolagens; p personagens; d int[];
begin
  select * into r from rolagens where id = p_rolagem_id for update;
  if not found then raise exception 'Rolagem não encontrada'; end if;
  select * into p from personagens where id = r.personagem_id for update;
  if p.dono_id <> auth.uid() and not is_mestre(p.campanha_id) then raise exception 'Sem permissão'; end if;
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

-- só quem está logado chama as RPCs; os auxiliares ficam internos
revoke execute on function public.jogar_d100(int), public.gastar_pe(uuid, int) from public, anon, authenticated;
revoke execute on function public.rolar_d100(uuid, boolean), public.refazer(uuid) from public, anon;
grant execute on function public.rolar_d100(uuid, boolean), public.refazer(uuid) to authenticated;

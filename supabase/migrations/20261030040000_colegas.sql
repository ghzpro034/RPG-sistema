-- Jogadores veem o nome e a foto dos colegas de mesa, sem acesso ao resto da ficha.
-- O RLS de personagens continua fechado; esta função devolve só o básico, e só para quem é da mesa.
create function public.colegas_da_mesa(p_campanha uuid)
returns table (id uuid, nome text, retrato_path text, jogador text, sou_eu boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.retrato_path, pr.nome, p.dono_id = auth.uid()
  from personagens p
  join profiles pr on pr.id = p.dono_id
  where p.campanha_id = p_campanha and is_membro(p_campanha)
  order by p.nome;
$$;

revoke execute on function public.colegas_da_mesa(uuid) from public, anon;
grant execute on function public.colegas_da_mesa(uuid) to authenticated;

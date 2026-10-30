-- Imagens: só o mestre envia, troca e apaga (retratos, itens e cartas). Todos da mesa continuam vendo.
-- Antes, a regra do retrato dependia da mesa de origem da ficha e quebrava com várias mesas
-- ("new row violates row-level security policy" ao trocar a foto).
-- Caminho do retrato continua {qualquer pasta}/retratos/{personagem_id}.{carimbo}.webp.

-- enviar/trocar/apagar retrato: o mestre de qualquer mesa onde a ficha está
create or replace function public.pode_enviar_retrato(caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select (storage.foldername(caminho))[2] = 'retratos'
     and is_mestre_do_personagem(
       (select p.id from personagens p where p.id::text = split_part(storage.filename(caminho), '.', 1))
     );
$$;

-- ver retrato: o dono, o mestre, ou quem divide alguma mesa com o personagem
create or replace function public.pode_ver_retrato(caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select (storage.foldername(caminho))[2] = 'retratos' and exists (
    select 1 from personagens p
    where p.id::text = split_part(storage.filename(caminho), '.', 1)
      and (
        pode_editar_ficha(p.id)
        or exists (
          select 1 from mesa_personagens mp
          join membros m on m.campanha_id = mp.campanha_id
          where mp.personagem_id = p.id and m.user_id = auth.uid()
        )
      )
  );
$$;

-- o player também não troca o retrato pela ficha (retrato_path)
create or replace function public.aplicar_travas() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.morto_em is not null and new.morto_em is not null then
    raise exception 'Personagem morto: a ficha é só leitura';
  end if;
  if not is_mestre_do_personagem(old.id) then
    if new.retrato_path is distinct from old.retrato_path then
      raise exception 'Só o mestre troca o retrato';
    end if;
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

-- ===== Conferência (só leitura): o resultado aparece embaixo do SQL Editor =====
-- Para cada personagem e cada mesa onde ele está, simula o mestre daquela mesa enviando a foto.
select
  p.nome as personagem,
  c.nome as mesa,
  (select set_config('request.jwt.claims', json_build_object('sub', c.mestre_id::text)::text, true)) is not null as simulado,
  public.pode_enviar_retrato(p.campanha_id || '/retratos/' || p.id || '.1.webp') as mestre_pode_enviar,
  public.pode_ver_retrato(p.campanha_id || '/retratos/' || p.id || '.1.webp') as mestre_pode_ver
from personagens p
join mesa_personagens mp on mp.personagem_id = p.id
join campanhas c on c.id = mp.campanha_id
order by p.nome, c.nome;

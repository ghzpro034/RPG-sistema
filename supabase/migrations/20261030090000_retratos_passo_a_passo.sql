-- Retratos, segunda correção. O diagnóstico mostrou: o mestre É mestre da ficha, o caminho está certo,
-- mas pode_enviar_retrato devolvia false. A busca da ficha pelo nome do arquivo (via storage.foldername /
-- storage.filename dentro da função) falhava. Agora o caminho é lido passo a passo, sem essas funções.
-- Regra mantida: só o mestre envia/troca/apaga; vê quem edita a ficha ou divide mesa com ela.

-- {pasta}/retratos/{personagem_id}.{carimbo}.webp  →  personagem_id (ou null se não for um retrato)
create or replace function public.retrato_personagem(caminho text) returns uuid
language plpgsql immutable set search_path = public as $$
declare
  partes text[] := string_to_array(caminho, '/');
  id_txt text;
begin
  if coalesce(array_length(partes, 1), 0) <> 3 or partes[2] <> 'retratos' then
    return null;
  end if;
  id_txt := split_part(partes[3], '.', 1);
  if id_txt !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return id_txt::uuid;
end $$;

create or replace function public.pode_enviar_retrato(caminho text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare p uuid := retrato_personagem(caminho);
begin
  if p is null then return false; end if;
  return is_mestre_do_personagem(p);
end $$;

create or replace function public.pode_ver_retrato(caminho text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare p uuid := retrato_personagem(caminho);
begin
  if p is null then return false; end if;
  return pode_editar_ficha(p) or exists (
    select 1 from mesa_personagens mp
    join membros m on m.campanha_id = mp.campanha_id
    where mp.personagem_id = p and m.user_id = auth.uid()
  );
end $$;

grant execute on function public.retrato_personagem(text), public.pode_enviar_retrato(text), public.pode_ver_retrato(text)
  to authenticated;
revoke execute on function public.retrato_personagem(text) from anon;

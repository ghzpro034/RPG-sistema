-- Imagens: limite no próprio bucket e limpeza das que ficaram sem uso.
-- O banco não pode apagar arquivos do Storage direto (só pela API do Storage). Então ele anota quais
-- sobraram e o app do mestre apaga quando abre a Mesa ou o Catálogo.

-- ========== LIMITE ==========
-- o app já comprime tudo para WebP de ~150 KB; o bucket passa a recusar o resto, mesmo vindo direto da API
update storage.buckets
set file_size_limit = 1048576, allowed_mime_types = array['image/webp']
where id = 'imagens';

-- ========== FILA DE DESCARTE ==========
create table public.imagens_descartadas (
  caminho text primary key,
  mestre_id uuid not null references public.profiles on delete cascade,
  em timestamptz not null default now()
);
alter table public.imagens_descartadas enable row level security;
-- sem políticas: ninguém lê nem escreve direto, só pelas funções abaixo
revoke all on public.imagens_descartadas from anon, authenticated;

create function public.imagem_em_uso(alvo text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from personagens where retrato_path = alvo)
      or exists (select 1 from itens where imagem_path = alvo)
      or exists (select 1 from cartas where imagem_path = alvo);
$$;

-- mesa apagada: as fichas somem junto e ninguém mais é mestre da pasta, então anota os arquivos antes
create function public.descartar_imagens_da_mesa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into imagens_descartadas (caminho, mestre_id)
  select o.name, old.mestre_id from storage.objects o
  where o.bucket_id = 'imagens' and split_part(o.name, '/', 1) = old.id::text
  on conflict (caminho) do nothing;
  return old;
end $$;

create trigger descartar_imagens_da_mesa before delete on public.campanhas
for each row execute function public.descartar_imagens_da_mesa();

-- Devolve ao mestre as imagens dele que podem ser apagadas. Pega as órfãs das pastas dele (o catálogo
-- e as mesas que ele mestra): retrato trocado, ficha/item/carta apagados, envio que não chegou a ser salvo.
-- Só as com mais de 1 hora, para não pegar um envio que ainda vai ser salvo.
create function public.imagens_para_apagar() returns text[]
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid();
begin
  if eu is null then return array[]::text[]; end if;

  insert into imagens_descartadas (caminho, mestre_id)
  select o.name, eu from storage.objects o
  where o.bucket_id = 'imagens'
    and o.created_at < now() - interval '1 hour'
    and (split_part(o.name, '/', 1) = eu::text
         or split_part(o.name, '/', 1) in (select id::text from campanhas where mestre_id = eu))
    and not imagem_em_uso(o.name)
  on conflict (caminho) do nothing;

  -- tira da fila o que já saiu do Storage (ou voltou a ser usado)
  delete from imagens_descartadas d
  where d.mestre_id = eu
    and (imagem_em_uso(d.caminho)
         or not exists (select 1 from storage.objects o where o.bucket_id = 'imagens' and o.name = d.caminho));

  return array(select d.caminho from imagens_descartadas d where d.mestre_id = eu);
end $$;

-- o Storage pede ver e apagar; vale só para o que está na fila do próprio mestre e não está em uso
create function public.pode_descartar_imagem(alvo text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from imagens_descartadas d where d.caminho = alvo and d.mestre_id = auth.uid())
     and not imagem_em_uso(alvo);
$$;

create policy "mestre ve imagens descartadas" on storage.objects for select to authenticated
  using (bucket_id = 'imagens' and pode_descartar_imagem(name));

create policy "mestre apaga imagens descartadas" on storage.objects for delete to authenticated
  using (bucket_id = 'imagens' and pode_descartar_imagem(name));

revoke execute on function public.imagem_em_uso(text), public.descartar_imagens_da_mesa(),
  public.imagens_para_apagar(), public.pode_descartar_imagem(text) from public, anon, authenticated;
grant execute on function public.imagens_para_apagar(), public.pode_descartar_imagem(text) to authenticated;

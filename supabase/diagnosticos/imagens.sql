-- Diagnóstico das permissões de imagem (só leitura, não muda nada).
-- Cole TUDO no SQL Editor e rode de uma vez. O resultado é uma célula com um JSON: copie e mande.
-- Troque 'mesinha' pelo nome de uma mesa sua, se quiser simular outra.

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select mestre_id::text from campanhas where nome = 'mesinha' limit 1),
    'role', 'authenticated'
  )::text,
  true
);

select json_build_object(
  'eu', auth.uid(),
  'mesa_simulada', (select json_build_object('id', id, 'mestre_id', mestre_id) from campanhas where nome = 'mesinha' limit 1),
  'minhas_mesas', (select json_agg(json_build_object('mesa', c.nome, 'papel', m.papel))
                   from membros m join campanhas c on c.id = m.campanha_id where m.user_id = auth.uid()),
  'fichas', (
    select json_agg(json_build_object(
      'nome', p.nome,
      'caminho', l.caminho,
      'pastas', storage.foldername(l.caminho),
      'arquivo', storage.filename(l.caminho),
      'id_no_arquivo', split_part(storage.filename(l.caminho), '.', 1),
      'pasta_2', (storage.foldername(l.caminho))[2],
      'id_lido_pela_regra', public.retrato_personagem(l.caminho),
      'ficha_encontrada', exists (select 1 from personagens x where x.id = public.retrato_personagem(l.caminho)),
      'mesas_da_ficha', (select json_agg(mp.campanha_id) from mesa_personagens mp where mp.personagem_id = p.id),
      'sou_mestre_da_ficha', public.is_mestre_do_personagem(p.id),
      'posso_enviar', public.pode_enviar_retrato(l.caminho),
      'posso_ver', public.pode_ver_retrato(l.caminho)
    ))
    from personagens p,
    lateral (select p.campanha_id || '/retratos/' || p.id || '.1.webp' as caminho) l
  ),
  'politicas_storage', (
    select json_agg(json_build_object(
      'nome', policyname, 'acao', cmd, 'permissiva', permissive, 'papeis', roles,
      'using', qual, 'check', with_check
    ))
    from pg_policies where schemaname = 'storage'
  ),
  'tabelas_storage_com_rls', (
    select json_agg(c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage' and c.relkind = 'r' and c.relrowsecurity
  ),
  'bucket', (select json_build_object('id', id, 'publico', public, 'tamanho_max', file_size_limit, 'tipos', allowed_mime_types)
             from storage.buckets where id = 'imagens')
) as diagnostico;

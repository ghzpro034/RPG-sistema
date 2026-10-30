-- Tabelas novas ganham permissão para "anon" por padrão no Supabase.
-- O RLS já barrava a leitura, mas quem não está logado não deve nem chegar a consultar.
revoke all on public.mesa_personagens from anon;

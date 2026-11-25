-- Manter o Supabase grátis acordado.
-- O projeto pausou em novembro mesmo com o keep-alive batendo a cada 3 dias: a consulta antiga era recusada
-- ("sem permissão") e isso não contou como uso. Agora o batimento faz uma escrita de verdade numa linha só.
-- Quem chama: o Vercel Cron todo dia (app/api/manter-vivo) e o GitHub Actions a cada 3 dias (reserva).

create table public.batimentos (
  id smallint primary key default 1 check (id = 1),
  em timestamptz not null default now(),
  origem text
);
alter table public.batimentos enable row level security;
-- sem políticas: ninguém lê nem escreve direto, só pela função abaixo
revoke all on public.batimentos from anon, authenticated;
insert into public.batimentos (id) values (1) on conflict (id) do nothing;

-- atualiza a única linha e devolve a hora; aberta para quem não está logado (é o que o cron usa)
create function public.manter_vivo(p_origem text default null) returns timestamptz
language sql security definer set search_path = public as $$
  update batimentos set em = now(), origem = left(coalesce(p_origem, 'desconhecida'), 40) where id = 1
  returning em;
$$;

revoke execute on function public.manter_vivo(text) from public;
grant execute on function public.manter_vivo(text) to anon, authenticated;

-- Dentes: uma das moedas principais do RPG (o contador com o dente no inventário).
alter table public.personagens
  add column dentes int not null default 0 check (dentes >= 0);

-- ficha nova do player também nasce sem dentes
create or replace function public.nova_ficha_antes() returns trigger
language plpgsql set search_path = public as $$
begin
  if not is_mestre(new.campanha_id) then
    new.travas := '{"atributos": true, "vida_max": true, "pe": true}';
    new.vida := 20;
    new.vida_max := 20;
    new.pe := 7;
    new.pe_max := 7;
    new.defesa := 0;
    new.corrupcao := 0;
    new.congelado := 0;
    new.dentes := 0;
    new.enganou_morte := false;
  end if;
  return new;
end $$;

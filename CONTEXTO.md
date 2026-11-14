# Contexto e estado do projeto — A Silent Machine

> **Este arquivo é a fonte da verdade sobre o projeto.** Leia antes de começar qualquer trabalho e
> atualize no mesmo commit de qualquer mudança que altere o que está escrito aqui (nova função,
> migration, decisão de regra, pendência resolvida ou nova).
>
> Última atualização: 2026-11-14
>
> Visão completa (histórico, decisões com o porquê, banco, desempenho): [`RELATORIO.md`](RELATORIO.md).

## O que é

Sistema web de fichas para a mesa de RPG **A Silent Machine**, substituindo a ficha que a mesa usava no Canva.
Cada jogador edita só a própria ficha; o mestre vê e edita todas, entrega itens e cartas, e acompanha as
rolagens de D100 ao vivo. Projeto pessoal, tudo no plano grátis. A maioria dos jogadores usa no **celular**;
o mestre usa no notebook.

"Grimório" foi o nome provisório e sobrou só por dentro: pacote npm `grimorio`, cookie `grimorio_mesa`,
variável de banco `grimorio.rpc` e as configurações em `.claude/launch.json`.

## Onde está

| O quê | Onde |
|---|---|
| Site no ar | https://rpg-sistema-three.vercel.app |
| Repositório | https://github.com/ghzpro034/RPG-sistema (branch `main`) |
| Deploy | Vercel, projeto `projetos-fd57/rpg-sistema` — cada push no `main` publica. As funções rodam em São Paulo (`gru1`, no `vercel.json`), perto do banco |
| Banco, login, imagens, tempo real | Supabase (Postgres + RLS, Auth e-mail/senha, Storage, Realtime) |
| Keep-alive do Supabase | `.github/workflows/keepalive.yml`, a cada 3 dias (secrets `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`) |
| Variáveis locais | `.env.local` (fora do git); modelo em `.env.example` |

Segredos nunca entram no repositório nem no front: só a URL e a **publishable key** vão para o navegador.
A secret key e a senha do Postgres não são usadas pelo app.

## Stack e convenções

- **Next.js 16.4** (App Router, Cache Components, `partialPrefetching`). Versão com mudanças grandes: leia
  `node_modules/next/dist/docs/` antes de usar uma API (ver `AGENTS.md`). `proxy.ts` substitui o middleware;
  `params`/`searchParams` são Promises; páginas que leem cookies ficam dentro de `<Suspense>`.
- **React 19** com React Compiler (evite `useMemo` desnecessário; hooks nunca depois de `return` condicional).
- **Tailwind 4 + shadcn/ui** (`base-nova`, sobre `@base-ui/react`). `cn` vem do pacote `cn`.
- Fontes Cinzel (títulos) e Cormorant Garamond (texto). Fundo preto puro; cores da ficha do Canva.
- Interface, código (nomes de funções e variáveis) e comentários **em português**.
- **Regras e permissões ficam no banco** (RLS, RPC, trigger), nunca só no front.

## Estrutura

- `app/` — `(auth)/entrar` e `(auth)/cadastro`, `comecar` (criar ou entrar numa mesa), `(mesa)/ficha`
  (ficha do jogador), `(mesa)/ficha/[id]`, `(mesa)/mesa` (painel do mestre ao vivo), `(mesa)/mesas`
  (trocar de mesa), `(mesa)/catalogo` (itens e cartas do mestre). `actions.ts` tem as server actions;
  `manifest.ts`, `icon.png` e `apple-icon.png` são do PWA.
- `components/ficha/` — blocos da ficha (`Cabecalho`, `Vitais`, `Atributos`, `Baralho`, `Inventario`,
  `Conhecimento`, `EnganarMorte`, `MemoriasGracas`, `Travas`, `Companheiros`), `contexto.tsx`
  (salvar/sincronizar a ficha) e `rolador.tsx` (D100, Reforçar/Refazer, últimas rolagens).
- `components/mesa/` — `MesaAoVivo`, `EntregarItem`, `HistoricoAlteracoes`, `TrazerPersonagem`, `Memorial`.
- `components/Estados.tsx` — esqueletos de carregamento (`EsqueletoFicha`, `EsqueletoMesa`, `EsqueletoLista`,
  `CarregandoTela`), `Vazio` (lista vazia) e `NaoEncontrado`. `TelaDeErro.tsx` (usada pelos `error.tsx`),
  `SemInternet.tsx` (faixa vermelha quando o aparelho fica offline) e `BotaoSair.tsx`.
  Novas telas devem usar esses componentes em vez de texto solto.
- `lib/` — `sessao.ts` (usuário, mesa aberta, papel), `ficha.ts`, `mesa.ts`, `conteudo.ts`
  (cartas/inventário/graças/catálogo + URLs assinadas), `imagem.ts` (compressão, envio e limpeza),
  `ficha-tipos.ts` (tipos e constantes), `estado.ts` (Estável/Ferido/Instável), `supabase/` (clientes;
  `nomeCanal()` gera nomes únicos de canal Realtime).
- `supabase/migrations/` — esquema em ordem (tabela abaixo). `supabase/diagnosticos/imagens.sql` é só leitura.
- `public/` — `sw.js` (service worker: mostra `offline.html` sem internet e guarda as imagens do RPG), `icones/`.
- `scripts/gerar-icones.mjs` — gera os ícones do PWA a partir de `scripts/icone-origem.svg`.

## Regras do jogo (confirmadas pelo usuário)

- **D100:** sucesso quando `resultado <= atributo` (empate é sucesso).
- **Reforçar (−1 PE):** declarado antes de rolar; rola 2 dados e vale o menor.
- **Refazer (−2 PE):** sem limite enquanto houver PE; repete no mesmo modo (reforçada rola 2 de novo, cobrando só os 2 PE).
- **Estados da vida:** Estável, Ferido (< 10), Instável (< 5).
- **Congelamento:** passou de 10, o personagem congela no frio.
- **Dentes:** moeda principal do RPG.
- **Inventário:** 4 espaços. Raridades: Comum (branco), Incomum (azul), Único (roxo).
- **Conhecimento:** lista fixa de 16 áreas; as dominantes ficam em destaque.
- **Enganar a morte:** vem de carta (ex.: Agraciado); fica riscado depois de usado.
- **Em aberto:** o que medem as estrelas ★☆☆☆ dos itens.

## Decisões de funcionamento

- **Várias mesas:** o mestre pode ter várias. Cada jogador tem **um** personagem vivo, e a mesma ficha pode estar
  em várias mesas ao mesmo tempo (`mesa_personagens`); `personagens.campanha_id` é só a mesa de origem.
  A mesa aberta fica no cookie `grimorio_mesa` e o papel (mestre/player) vale para ela.
  O mestre traz fichas de outras mesas dele (`importar_personagem`) e tira (`remover_da_mesa`).
- **Catálogo:** itens e cartas são do mestre (`mestre_id`) e valem em todas as mesas dele.
- **Morte:** o mestre registra (`matar_personagem`, epitáfio opcional); a ficha vai para o memorial, fica só
  leitura e pode voltar (`reviver_personagem`). O jogador sai das mesas e, para voltar, cria outro personagem.
- **Imagens:** só o mestre envia, troca e apaga (retratos, itens, cartas); jogadores só veem. Tudo vira WebP
  de ~150 KB / 800 px no navegador. Bucket privado `imagens`, URLs assinadas de 7 dias.
  O `sw.js` guarda cada imagem no aparelho pelo caminho, sem o token (até 300; cada envio tem nome novo,
  então nunca fica uma versão velha). O botão Sair apaga esse cache. O CSP do `sw.js` (`next.config.ts`)
  libera `connect-src` para a URL do Supabase.
  Nas políticas do Storage, leia o caminho com `string_to_array` (como `retrato_personagem()`), não com
  `storage.foldername()` dentro de funções — isso já causou erro de RLS.
- **Gastar PE** só por RPC (`security definer` + `set_config('grimorio.rpc','on',true)`), por causa do trigger de travas.
- **PWA:** instalável no celular; o ícone atual é **provisório** (engrenagem dourada).

## Migrations

O usuário roda cada migration no **SQL Editor do Supabase** antes do push do código que depende dela.

| Migration | O que faz | Rodada no Supabase? |
|---|---|---|
| `20261030000000_esquema_inicial` | Tabelas, RLS, RPCs, Storage | sim |
| `20261030010000_moeda_dentes` | Coluna `dentes` | sim |
| `20261030020000_regras_d100` | Regras do D100, Reforçar/Refazer | sim |
| `20261030030000_fase4` | Realtime de cartas/graças, Enganar a morte, log do inventário, limite de memórias | sim |
| `20261030040000_colegas` | `colegas_da_mesa` | sim |
| `20261030050000_varias_mesas` | `mesa_personagens`, catálogo do mestre, importar/remover | sim |
| `20261030060000_fecha_anon` | Fecha `mesa_personagens` para quem não está logado | sim |
| `20261030070000_morte` | Morte, memorial, reviver | sim |
| `20261030080000_retratos` | Só o mestre envia retratos | sim |
| `20261030090000_retratos_passo_a_passo` | Correção das regras de retrato | sim |
| `20261030100000_limpeza_imagens` | Bucket aceita só WebP até 1 MB; fila e limpeza de imagens sem uso | sim |

## Estado atual

**No ar:** fases 0 a 4 do plano, visual da ficha do Canva, colegas de mesa, várias mesas,
morte e memorial, só o mestre envia imagens, mestre remove itens dos jogadores, layout de celular revisado, PWA,
limite do bucket (só WebP até 1 MB) e limpeza automática das imagens sem uso (`apagarImagensSemUso()` em
`lib/imagem.ts`, roda quando o mestre abre a Mesa ou o Catálogo e só pega imagens com mais de 1 hora),
funções da Vercel em São Paulo, imagens guardadas no celular pelo service worker, e telas de carregamento
(esqueletos), erro, página não encontrada, listas vazias e aviso de sem internet.

**Em andamento:** nada.

**Ainda não testado logado:**
- A limpeza de imagens (confira se uma imagem trocada some do Storage depois de 1 hora, ao abrir a Mesa como mestre).
- As imagens guardadas no celular (na segunda abertura da ficha, as imagens aparecem na hora, sem baixar de novo).
- A ficha e a Mesa mais rápidas com as funções em São Paulo (medir na aba Rede do navegador).

## Pendências

**Dependem do mestre / da mesa**
- Símbolo oficial do RPG para o ícone do PWA (trocar `scripts/icone-origem.svg` e rodar `node scripts/gerar-icones.mjs`).
- Artes: retratos e imagens de cartas e itens (o mestre sobe pelo Catálogo e por "Trocar foto").
- Cadastro do Ivan: cartas O Cuidador, O Órfão, Trauma de Abandono, Agraciado, Incerteza Biológica;
  itens Arma de Pressão e Ossos Pequenos.
- Significado das estrelas ★☆☆☆ dos itens.

**Testes do usuário**
- Instalar o PWA num Android e num iPhone de verdade.

**Melhorias opcionais**
- Animação do dado (respeitando `prefers-reduced-motion`).
- Testes automatizados dos fluxos principais (login, ficha, D100, mesa).

**Técnicas, sem pressa**
- Tipos gerados do banco (`lib/tipos.ts`) — precisa do token do Supabase CLI.
- "Esqueci a senha" (hoje o mestre redefine pelo painel do Supabase).
- Remoção de item ao vivo: o jogador com a ficha aberta só vê ao voltar para a aba ou recarregar.
- Keep-alive: o GitHub desliga workflows agendados após 60 dias sem commits.
- Opcional: domínio melhor na Vercel (e atualizar a Site URL no Supabase depois).

## Como o trabalho anda

1. O usuário pede; mudanças com migration param para ele rodar no SQL Editor do Supabase e avisar.
2. Conferir com `npx tsc --noEmit`, `npx eslint` e `npm run build` (se o build acusar tipos órfãos, apague `.next/dev`).
3. Commit e push no `main` só quando o usuário aprovar ("commit e push"); a Vercel publica sozinha.
4. Atualizar este arquivo no mesmo commit.

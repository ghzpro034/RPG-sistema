# Contexto e estado do projeto — A Silent Machine

> **Este arquivo é a fonte da verdade sobre o projeto.** Leia antes de começar qualquer trabalho e
> atualize no mesmo commit de qualquer mudança que altere o que está escrito aqui (nova função,
> migration, decisão de regra, pendência resolvida ou nova).
>
> Última atualização: 2026-11-27
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
| Keep-alive do Supabase | **Vercel Cron diário** (`vercel.json` → `app/api/manter-vivo`) e, de reserva, `.github/workflows/keepalive.yml` a cada 3 dias (secrets `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`). Os dois chamam a RPC `manter_vivo`, que grava na tabela `batimentos`. Com `CRON_SECRET` na Vercel (já criada), a rota só aceita o cron |
| Variáveis locais | `.env.local` (fora do git); modelo em `.env.example` |

Segredos nunca entram no repositório nem no front: só a URL e a **publishable key** vão para o navegador.
A secret key e a senha do Postgres não são usadas pelo app.

## Stack e convenções

- **Next.js 16.4.6** (App Router, Cache Components, `partialPrefetching`). Versão com mudanças grandes: leia
  `node_modules/next/dist/docs/` antes de usar uma API (ver `AGENTS.md`). `proxy.ts` substitui o middleware;
  `params`/`searchParams` são Promises; páginas que leem cookies ficam dentro de `<Suspense>`.
- **React 19** com React Compiler (evite `useMemo` desnecessário; hooks nunca depois de `return` condicional).
- **Tailwind 4 + shadcn/ui** (`base-nova`, sobre `@base-ui/react`). `cn` vem do pacote `cn`.
- **Estética das cartas e da ficha física (25/11):** fundo preto com um grão de papel bem fraco (`body::before` em
  `globals.css`); títulos em **Grenze Gotisch** (`font-heading`, a serifa condensada de gravura das cartas e da ficha
  física, em caixa normal, sem `uppercase`/`tracking`); rótulos pequenos em maiúsculas em **Belleza** (`font-rotulo`,
  como "TRAUMA" e "FORÇA"); texto em Cormorant Garamond. Iniciais soltas e numerais romanos **não** usam a Grenze
  (o "I" gótico parece um "D"): iniciais em `font-rotulo`, nível em `font-sans`. Cores da ficha do Canva.
- **Sigilo** (`components/Sigilo.tsx`): o símbolo das cartas, em SVG com `currentColor`; aparece no login, no topo e
  é o ícone do PWA (`scripts/icone-origem.svg`). `Divisor` é o "— ✤ —" entre seções; `Cantoneiras` são os cantos de
  gravura da ficha física; a utility `moldura-carta` faz a borda dupla das cartas.
- **Celular e PC (auditoria de 27/11, de 320 a 1920 px):** nada pode rolar para o lado nem ficar cortado com "…" em
  nenhuma largura (nomes longos quebram em até 2 linhas com `line-clamp-2`). Alvos de toque com pelo menos 44 px no
  celular: o `Button` e o `Input` do shadcn (`components/ui/`) têm `pointer-coarse:min-h-11` (em tela de toque nada fica
  abaixo de 44 px; no mouse continuam compactos), e os botões de − e + usam `pointer-coarse:size-11`. Na fonte gótica, "D" (de D100, D20) e numerais
  romanos saem em `font-sans`/`font-rotulo`, porque o D da Grenze parece "Đ". iPhone: `viewportFit: "cover"` e as
  margens seguras (`env(safe-area-inset-*)`) no `body` e no painel do dado. O topo e o conteúdo usam o mesmo
  `max-w-6xl`. No topo do mestre, no celular, Painel, Catálogo e Sair viram ícones.
  A Mesa é a única página larga: ela marca `data-largura="ampla"` e o layout (`group/pagina`) alarga o topo e o
  conteúdo para 1600 px; os cards ficam em 3 colunas a partir de `2xl` e o feed ao vivo fica ao lado já no tablet (`md`).
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
- `components/mesa/` — `MesaAoVivo`, `PainelCombate` (ordem e vez), `AplicarDano`, `EntregarItem`,
  `HistoricoAlteracoes`, `TrazerPersonagem`, `Memorial`. `components/combate.ts` tem o hook `useCombate`
  (Mesa e ficha); `components/ficha/Combate.tsx` é o painel de combate da ficha.
- `components/Sigilo.tsx`, `Divisor.tsx`, `Cantoneiras.tsx` — o símbolo do RPG, o ornamento entre seções e os cantos de gravura.
- `components/Estados.tsx` — esqueletos de carregamento (`EsqueletoFicha`, `EsqueletoMesa`, `EsqueletoLista`,
  `CarregandoTela`), `Vazio` (lista vazia) e `NaoEncontrado`. `TelaDeErro.tsx` (usada pelos `error.tsx`),
  `SemInternet.tsx` (faixa vermelha quando o aparelho fica offline) e `BotaoSair.tsx`.
  Novas telas devem usar esses componentes em vez de texto solto.
- `lib/` — `sessao.ts` (usuário, mesa aberta, papel), `ficha.ts`, `mesa.ts`, `conteudo.ts`
  (cartas/inventário/graças/catálogo + URLs assinadas), `imagem.ts` (compressão, envio e limpeza),
  `ficha-tipos.ts` (tipos e constantes), `estado.ts` (Estável/Ferido/Instável/Morrendo e o efeito de cada um), `supabase/` (clientes;
  `nomeCanal()` gera nomes únicos de canal Realtime).
- `supabase/migrations/` — esquema em ordem (tabela abaixo). `supabase/diagnosticos/imagens.sql` é só leitura.
- `public/` — `sw.js` (service worker: mostra `offline.html` sem internet e guarda as imagens do RPG), `icones/`,
  `cartas/` (as 19 artes do Compêndio em WebP: `arquetipo-*.webp` e `trauma-*.webp`).
- `scripts/gerar-icones.mjs` — gera os ícones do PWA a partir de `scripts/icone-origem.svg`.

## Regras do jogo (confirmadas pelo usuário)

> **O sistema mudou (18/11/2026)** e o **Compêndio do Sistema é a fonte oficial**: quando uma ficha antiga disser
> outra coisa, vale o Compêndio. As regras completas e atuais estão em [`docs/SISTEMA.md`](docs/SISTEMA.md),
> resumidas do Compêndio do Sistema e das fichas novas. O app inteiro já segue o sistema novo (Fases A a D: ficha,
> cartas, inventário e combate).

- **Características e especializações:** Vigor (Força, Movimento, Furtividade, Resistência), Mental (Vasculhar,
  Percepção, Conhecimento, Atirar, Criar), Social (Lábia, Intimidação, Adestramento, Sorte, Presença). O valor de
  Vigor/Mental/Social fica em `personagens.vigor|mental|social` e **o mestre digita** (ainda não há fórmula).
- **D100 (`rolar_d100`):** na característica; sucesso quando `resultado <= valor` (empate é sucesso, decisão do usuário).
- **D20 (`rolar_d20`):** na especialização; o app soma `atributos.bonus` e mostra o total; **o mestre julga** (sucesso fica nulo).
- **Reforçar (−1 PE):** declarado antes de rolar; 2 dados (D100 vale o menor, D20 vale o maior).
- **Refazer (−2 PE):** sem limite enquanto houver PE; repete no mesmo dado e modo.
- **Estados da vida (`lib/estado.ts`):** Morrendo em 0; Instável abaixo de `limiar_instavel` (de cada ficha); Ferido
  abaixo de 50% da vida máxima; senão Estável.
- **Congelamento:** passou de `limite_congelado` (de cada ficha), o personagem congela no frio.
- **Sinergia, Proteção e raça:** Sinergia é um contador da ficha; Proteção é a coluna `defesa`; raça (Errante, Pálido,
  Sanguíneo) e os limites só o mestre muda.
- **Cartas (`cartas.tipo`):** arquétipo (**até 3** por personagem), trauma (ativar custa **5 PE**), habilidade única
  (**1** por personagem) e caminho (habilidade de Caminho, com `caminho` e `nivel`, paga em **Sinergia**). Os limites
  ficam no trigger `limite_do_baralho`. Custos em `custo_pe` e `custo_sinergia`; o texto vale o do Compêndio.
- **Usar uma carta (`usar_carta`):** o botão "Usar" aparece nas cartas com custo; dois toques (confirmar), cobra PE
  e/ou Sinergia e avisa a Mesa ao vivo (tabela `usos_carta`). Descontos (ex.: O Inocente) o mestre ajusta à mão.
- **Caminho da ficha:** Amor, Revolta ou Absurdo (`personagens.caminho`); só o mestre muda (aprende-se com quem já tem).
- **Combate (Fase D):** a mesa entra em combate pelo mestre (`definir_combate`). Cada personagem fica no **Grupo A ou B**
  (`mesa_personagens.grupo`, `definir_grupo`, só o mestre). A ordem sai do banco (`sequencia_do_combate`):
  Inimigo → 1º do A → Inimigo → 1º do B → …; **O Herói** vai primeiro no seu grupo. O mestre passa a vez
  (`avancar_vez`, também volta); no fim da sequência começa a rodada seguinte. A ficha mostra o grupo e
  "É a sua vez!" ao vivo (`estado_do_combate`, decidido em 26/11). A vez guarda **de quem** é
  (`campanhas.combate_vez_de` + `combate_vez_inimigo`, posição calculada por `vez_atual`): se alguém morre, troca de
  grupo ou sai no meio do combate, a vez continua com a mesma pessoa. "Começar" não zera um combate em andamento;
  "Encerrar" pede confirmação. Quem morre sai do grupo (trigger `morte_sai_do_combate`).
- **Tiro (`rolar_tiro`):** D8 (1 cabeça = crítico, 2 torso, 3-4 braços, 5-6 pernas = desvantagem no dano, 7-8 erro) ou
  D6 (atirador focado/arma avançada, sem erro). Dá para Refazer. A tabela fica em `lib/combate.ts`.
- **Dano (`rolar_dano`):** rola o dado do item ("2D10", "D15", "D6+3"): normal, desvantagem (rola duas vezes, vale o
  menor) ou crítico (máximo). O dano não se refaz.
- **Defender:** atalho para o D20 de Resistência. **Aplicar dano (`aplicar_dano`, mestre):** Defendeu corta pela metade
  (para baixo), a Proteção desconta (a não ser que esteja vulnerável), Instável com qualquer dano vai a 0, Morrendo
  não mexe na vida (o app avisa que é morte definitiva; o mestre usa "Morreu"). Decidido em 26/11.
- **Animação do dado (26/11):** enquanto o banco sorteia, o painel de resultado mostra o dado chacoalhando com
  números da faixa dele (`DadoGirando` em `rolador.tsx`), por no mínimo 0,65 s; depois o número cai com um impacto
  (`animate-revelar`). O resultado só entra nas últimas rolagens quando o dado para. Quem pediu menos movimento no
  aparelho vê o resultado direto (`motion-safe:` e `menosMovimento()`). Na Mesa, rolagens e cartas novas deslizam
  para dentro do feed (`animate-entrar`). As animações ficam no `@theme` de `globals.css`.
- **Recuperar Foco (`recuperar_foco`):** +2 PE (até o máximo); só Estável; **O Órfão** também quando Ferido; Instável e
  Morrendo não. Aparece na Mesa como ação (`usos_carta.tipo = 'acao'`, custo negativo = ganho). Decidido em 26/11.
- **Dentes:** moeda principal do RPG.
- **Inventário:** espaços **por raridade e por ficha** (`personagens.espacos_comum|incomum|unico`, padrão 4/2/1;
  só o mestre muda, decidido em 25/11). Raridades: Comum (branco), Incomum (azul), Único (roxo). Itens iguais empilham
  no mesmo espaço; `entregar_item` recusa quando a raridade está cheia.
- **Itens:** nome, raridade, **dano** (`dano`, ex.: "2D10"), bônus (`efeito`, ex.: "+6 de Resistência"), descrição e
  **criador** (`criador`).
- **Memórias de arma (`memorias_item`):** cada uma tem nome, descrição e efeito, escritos pelo mestre no Catálogo.
  Limite pela raridade: **Comum 1, Incomum 3, Único 5** (`max_memorias_da_raridade`). **As estrelas ★ são as memórias**
  (confirmado em 25/11): acesas = desbloqueadas na ficha (`inventario.memorias_desbloqueadas`). O jogador só lê o texto
  depois que o mestre desbloqueia.
- **Conhecimento:** lista fixa de 16 áreas; as dominantes ficam em destaque.
- **Enganar a morte:** vem de carta (ex.: Agraciado); fica riscado depois de usado.

## Decisões de funcionamento

- **Várias mesas:** o mestre pode ter várias. Cada jogador tem **um** personagem vivo, e a mesma ficha pode estar
  em várias mesas ao mesmo tempo (`mesa_personagens`); `personagens.campanha_id` é só a mesa de origem.
  A mesa aberta fica no cookie `grimorio_mesa` e o papel (mestre/player) vale para ela.
  O mestre traz fichas de outras mesas dele (`importar_personagem`) e tira (`remover_da_mesa`).
- **Catálogo:** itens e cartas são do mestre (`mestre_id`) e valem em todas as mesas dele. Os 12 arquétipos e os
  7 traumas do Compêndio entram sozinhos no catálogo de cada mestre (`semear_cartas_do_compendio`: na migration da
  Fase B e, para mestre novo, ao criar a primeira mesa). Carta antiga com o mesmo nome (ou "Trauma de X") ganha a arte,
  o custo e o texto do Compêndio.
- **Artes das cartas (decidido em 25/11):** ficam **embutidas no app** em `public/cartas/` (públicas, como qualquer
  arquivo do site). A coluna `cartas.arte` aponta para o arquivo; uma imagem enviada pelo mestre fica no lugar dela.
- **Morte:** o mestre registra (`matar_personagem`, epitáfio opcional); a ficha vai para o memorial, fica só
  leitura e pode voltar (`reviver_personagem`). O jogador sai das mesas e, para voltar, cria outro personagem.
- **Imagens:** só o mestre envia, troca e apaga (retratos, itens, cartas); jogadores só veem. Tudo vira WebP
  de ~150 KB / 800 px no navegador. Bucket privado `imagens`, URLs assinadas de 7 dias.
  O `sw.js` guarda cada imagem no aparelho pelo caminho, sem o token (até 300; cada envio tem nome novo,
  então nunca fica uma versão velha). O botão Sair apaga esse cache. O CSP do `sw.js` (`next.config.ts`)
  libera `connect-src` para a URL do Supabase.
  Nas políticas do Storage, leia o caminho com `string_to_array` (como `retrato_personagem()`), não com
  `storage.foldername()` dentro de funções — isso já causou erro de RLS.
- **Mesa ao vivo (auditoria de 27/11):** o −/+ de vida espera 0,5 s e manda a **diferença** (`ajustar_vida`), então um
  Dano no meio não é apagado; ao sair da Mesa ou ocultar a aba, o que estava esperando é salvo na hora. A Mesa remonta
  a cada carga do servidor (`carregadoEm` é a `key`) e recarrega tudo quando a conexão volta (`online`, Realtime
  reconectado) ou depois de 30 s com a aba oculta. Erro do banco vai para a tela de erro (não parece mesa vazia).
  Horários em `America/Sao_Paulo` (o servidor está em UTC).
- **Gastar PE** só por RPC (`security definer` + `set_config('grimorio.rpc','on',true)`), por causa do trigger de travas.
- **PWA:** instalável no celular; o ícone é o sigilo dourado das cartas (gerado por `scripts/gerar-icones.mjs`).

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
| `20261124000000_manter_vivo` | Tabela `batimentos` e RPC `manter_vivo` (aberta a anon) para o Supabase não pausar | sim |
| `20261125000000_sistema_fase_a` | Sistema novo na ficha: Vigor, Criar, características, bônus de D20, `rolar_d100` na característica, `rolar_d20`, limiares por ficha, Sinergia, raça | sim |
| `20261126000000_sistema_fase_b` | Cartas do sistema novo: tipo caminho (era revolta), custos em PE/Sinergia, arte, 19 cartas do Compêndio no catálogo, limites do baralho, `usar_carta` e `usos_carta`, Caminho da ficha só pelo mestre | sim |
| `20261127000000_sistema_fase_c` | Inventário do sistema novo: dano e criador nos itens, `memorias_item` (nome/descrição/efeito), limite de memórias pela raridade, espaços por raridade e por ficha, `entregar_item` por raridade | sim |
| `20261128000000_sistema_fase_d` | Combate: grupos A/B, estado do combate na mesa (rodada, vez) e a sequência no banco, `rolar_tiro`, `rolar_dano`, Refazer do tiro, `recuperar_foco`, `aplicar_dano`; rolagens aceitam tiro e dano | sim |
| `20261129000000_mesa_correcoes` | Auditoria da Mesa: a vez guarda a pessoa (`combate_vez_de`, `vez_atual`, `marcar_vez`), "Começar" não zera combate em andamento, morte sai do grupo, `ajustar_vida` (−/+ por diferença) | sim |

## Estado atual

**No ar:** fases 0 a 4 do plano, visual da ficha do Canva, colegas de mesa, várias mesas,
morte e memorial, só o mestre envia imagens, mestre remove itens dos jogadores, layout de celular revisado, PWA,
limite do bucket (só WebP até 1 MB) e limpeza automática das imagens sem uso (`apagarImagensSemUso()` em
`lib/imagem.ts`, roda quando o mestre abre a Mesa ou o Catálogo e só pega imagens com mais de 1 hora),
funções da Vercel em São Paulo, imagens guardadas no celular pelo service worker, e telas de carregamento
(esqueletos), erro, página não encontrada, listas vazias e aviso de sem internet. **Fase A do sistema novo**
(a ficha): Vigor/Mental/Social com D100, especializações com D20 e bônus, quatro estados de vida, Sinergia,
raça e limites por ficha. As fichas antigas foram convertidas: as características começaram pela média das
especializações e Criar entrou com 0 — **o mestre precisa conferir e ajustar esses valores**. **Fase B** (cartas):
as 19 cartas do Compêndio com arte no catálogo de cada mestre, custos em PE/Sinergia com o botão Usar e aviso na
Mesa, limites do baralho e Caminho da ficha escolhido pelo mestre. **Fase C** (inventário): espaços por raridade em
cada ficha, dano e criador nos itens, memórias de arma com nome/história/efeito e as estrelas ★. **Visual** das cartas
e fichas (Grenze Gotisch, Belleza, sigilo, molduras). **Fase D** (combate): grupos A/B, vez controlada pelo mestre
e vista ao vivo na ficha, tiro D8/D6, dano das armas, Defender, Recuperar Foco e aplicar dano com a conta.

**Em andamento:** nada. As correções da auditoria da Mesa estão no ar; as funcionalidades sugeridas estão em Pendências.

**Lição (24/11):** o Supabase pausou entre 16 e 19/11 mesmo com o keep-alive antigo, porque a consulta recebia
"sem permissão" e isso não contou como uso. O batimento precisa ser uma operação que dá certo (hoje, uma escrita).
`CRON_SECRET` já está criada na Vercel (Production).

**Lição (24/11):** com a 16.4.3, o Next.js passou a parar o build com `SecurityFatalError` (avisos de segurança) e o
deploy da Vercel falhou. Atualizado para 16.4.6. Se um deploy falhar do nada, rode `npm run build` local e procure esse erro.

**Ainda não testado logado:**
- A limpeza de imagens (confira se uma imagem trocada some do Storage depois de 1 hora, ao abrir a Mesa como mestre).
- As imagens guardadas no celular (na segunda abertura da ficha, as imagens aparecem na hora, sem baixar de novo).
- A Fase A: D100 numa característica, D20 numa especialização (com bônus), Reforçar/Refazer nos dois dados,
  e o mestre editando características, bônus, limiar de Instável, limite de congelamento e raça.
- A Fase D: começar um combate na Mesa, pôr cada um no Grupo A/B, passar a vez (a ficha do jogador mostra
  "É a sua vez!" ao vivo), atirar D8/D6, rolar o dano de uma arma, Recuperar Foco e aplicar dano com Defender.
- A Fase C: entregar itens até encher uma raridade (deve recusar), mudar os espaços como mestre, escrever as
  memórias de uma arma no Catálogo e desbloquear na ficha (o texto aparece, a estrela acende).
- A Fase B: as 19 cartas no Catálogo com arte, dar o 4º arquétipo (deve recusar), "Usar" num trauma (−5 PE) e
  numa carta de Caminho (−Sinergia), o aviso na Mesa ao vivo e o Caminho no cabeçalho.
- A ficha e a Mesa mais rápidas com as funções em São Paulo (medir na aba Rede do navegador).

## Pendências

**Adaptar o app ao sistema novo** (`docs/SISTEMA.md`), em fases:
- **A — Ficha:** no ar desde 25/11 (ver Regras do jogo).
- **B — Cartas:** no ar desde 25/11 (ver Regras do jogo).
- **C — Inventário:** no ar desde 25/11 (ver Regras do jogo).
- **D — Combate na Mesa:** no ar desde 26/11 (ver Regras do jogo).

**Dependem do mestre / da mesa**
- Se o RPG tiver um símbolo oficial diferente do sigilo das cartas: trocar `scripts/icone-origem.svg` e `components/Sigilo.tsx`
  e rodar `node scripts/gerar-icones.mjs`.
- Artes: retratos, imagens dos itens e das cartas que não são do Compêndio (o mestre sobe pelo Catálogo e por "Trocar foto").
- Cadastro do Ivan: cartas Agraciado (habilidade única) e Incerteza Biológica (Caminho da Revolta, I, 1 Sinergia);
  itens Arma de Pressão (Comum, D10, criada por Lucius Francis) e Ossos Pequenos (+6 de dano de fragmento).
- Conferir os espaços de cada ficha (começam em 4 Comum / 2 Incomum / 1 Único) e escrever as memórias das armas
  (ex.: Corte Seco do Baku). O Cuidador, O Órfão e Abandono já vêm do Compêndio.
- Habilidades de Caminho que faltam texto (Proteção de Placebo) e os efeitos do Destinatário.

**Testes do usuário**
- Instalar o PWA num Android e num iPhone de verdade.

**Funcionalidades sugeridas pela auditoria da Mesa (27/11), em ordem de valor**
- Julgar o D20 (✓/✗ que o jogador vê) e pedir teste com CD.
- Inimigos de verdade no combate (nome, vida, Proteção; dano neles; nome na ordem).
- Efeitos que duram rodadas (Vulnerável, Indefeso, Rigidez, Injustiça, marca da Humilhação), que somem sozinhos.
- −/+ de PE, Sinergia, Corrupção e Congelamento no card; ações para todos (Frio +1, Descanso — confirmar a regra).
- Curar (com O Cuidador: +5 e +2 PE); Subir de Nível Cósmico; Briga 1v1; dar dentes pela Mesa;
  O Cuidador vê a vida dos colegas na ficha.
- Defeitos menores que ficaram: nomes "?" de quem saiu, foco ao fechar o Dano, nomes repetidos em "Entregar item",
  "N itens" conta espaços, `aria-live` do histórico, fechar a aba no mesmo instante de um clique de vida.

**Melhorias opcionais**
- Testes automatizados dos fluxos principais (login, ficha, D100, mesa).

**Técnicas, sem pressa**
- Tipos gerados do banco (`lib/tipos.ts`) — precisa do token do Supabase CLI.
- "Esqueci a senha" (hoje o mestre redefine pelo painel do Supabase).
- Remoção de item ao vivo: o jogador com a ficha aberta só vê ao voltar para a aba ou recarregar.
- Keep-alive do GitHub: ele desliga workflows agendados após 60 dias sem commits (o Vercel Cron não tem esse limite).
- Opcional: domínio melhor na Vercel (e atualizar a Site URL no Supabase depois).

## Como o trabalho anda

1. O usuário pede; mudanças com migration param para ele rodar no SQL Editor do Supabase e avisar.
2. Conferir com `npx tsc --noEmit`, `npx eslint` e `npm run build` (se o build acusar tipos órfãos, apague `.next/dev`).
3. Commit e push no `main` só quando o usuário aprovar ("commit e push"); a Vercel publica sozinha.
4. Atualizar este arquivo no mesmo commit.

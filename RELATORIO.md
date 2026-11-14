# A Silent Machine — relatório completo do projeto

> Retrato do projeto em **11/11/2026**: o que foi decidido, o que está pronto, como o código está e o que falta.
> O estado do dia a dia fica no [`CONTEXTO.md`](CONTEXTO.md), que é atualizado a cada mudança. Este relatório
> é a visão completa, com o histórico e os porquês.

---

## 1. Resumo

**A Silent Machine** é o sistema web de fichas da mesa de RPG do Davi. Ele substitui a ficha que a mesa usava no Canva.

- **Jogador** (quase sempre no celular): vê e edita a própria ficha, rola o D100 com Reforçar e Refazer, vê os colegas de mesa.
- **Mestre** (no notebook): acompanha a mesa ao vivo, edita todas as fichas, trava o que o jogador pode mexer,
  entrega e remove itens e cartas, mantém o catálogo com imagens, cuida de várias mesas, registra mortes.
- **Custo zero:** Vercel Hobby, Supabase Free e GitHub Actions.
- **No ar:** https://rpg-sistema-three.vercel.app. O código está em https://github.com/ghzpro034/RPG-sistema (`main`).

---

## 2. Linha do tempo

| Data | Commit | O que entrou |
|---|---|---|
| 30/10 | `9522987` | **Fase 0:** base com Next.js 16, shadcn e tema da ficha |
| 30/10 | `a56052b` | **Fase 1:** esquema do banco, sessão, cadastro e login, criar e entrar em mesa |
| 30/10 | `b9e1f9c` | Primeiro deploy na Vercel |
| 30/10 | `5be29e0` | **Fase 2:** ficha do jogador no visual do Canva |
| 30/10 | `1c14389` | **Fase 3:** mesa ao vivo, D100 com as regras confirmadas |
| 30/10 | `59f556d` | **Fase 4:** catálogo, entregas, habilidade, memórias, graças, histórico |
| 30/10 | `14f1278` | Keep-alive do Supabase no GitHub Actions |
| 30/10 | `8663fde` | Companheiros: jogadores veem nome e foto dos colegas |
| 30/10 | `170de44` | Várias mesas por mestre, a mesma ficha em várias mesas |
| 30/10 | `3c12ec1` | Morte do personagem e memorial |
| 30/10 | `ae99b62` | Só o mestre envia imagens; regras de retrato corrigidas |
| 30/10 | `fcc80e6` | Revisão para celular: ficha mais compacta, alvos de toque maiores |
| 30/10 | `d0c37d1` | Nome "A Silent Machine", mestre remove itens, canais de tempo real únicos |
| 30/10 | `baf2c19` | PWA: instalar no celular |
| 09/11 | `a225a8f` | Limite do bucket de imagens, limpeza de imagens sem uso, `CONTEXTO.md` |

---

## 3. Decisões tomadas

### Produto e regras

| Decisão | Como ficou | Por quê |
|---|---|---|
| Referência visual | A ficha do Canva (personagem Ivan Achebe): fundo preto, Força vermelha, Mental azul-claro, Social verde, Corrupção roxa, PE no losango dourado | Os jogadores precisam reconhecer a ficha que já usam |
| D100 | Sucesso com `resultado <= atributo` (empate é sucesso) | Confirmado pelo usuário |
| Reforçar (−1 PE) | Declarado **antes** de rolar; rola 2 dados e vale o menor | Confirmado (o plano original dizia "−10 no resultado") |
| Refazer (−2 PE) | Sem limite enquanto houver PE; repete no mesmo modo e cobra só os 2 PE | Confirmado |
| Congelamento | Círculo cinza abaixo da vida; passou de 10, congela no frio | Explicado pelo usuário |
| Dentes | Moeda principal do RPG (coluna `dentes`) | Explicado pelo usuário |
| Inventário | 4 espaços. Raridades Comum (branco), Incomum (azul), Único (roxo). Só o mestre entrega e remove | Igual ao Canva; evita jogador se dar itens |
| Conhecimento | Lista fixa de 16 áreas; as dominantes ficam destacadas | Igual ao Canva |
| Nome | "A Silent Machine" no site; "Grimório" ficou só por dentro do código | Pedido do usuário |

### Funcionamento

| Decisão | Como ficou |
|---|---|
| Várias mesas | Um mestre tem várias mesas. Cada jogador tem **um** personagem vivo, que pode estar em várias mesas ao mesmo tempo (tabela `mesa_personagens`). O mestre traz fichas de outras mesas dele e tira da mesa |
| Mesa aberta | Guardada no cookie `grimorio_mesa`; o papel (mestre ou jogador) vale para a mesa aberta |
| Catálogo | Itens e cartas são **do mestre** e valem em todas as mesas dele |
| Morte | O mestre registra (com epitáfio opcional). A ficha vai para o **memorial**, fica só leitura e pode ser revivida. O jogador sai das mesas; para voltar, entra com o código e cria outro personagem |
| Imagens | **Só o mestre** envia, troca e apaga (retratos, itens, cartas). Jogadores só veem |
| Travas | O mestre liga e desliga o que o jogador pode editar: atributos, vida máxima e PE |
| Senhas | Sem "esqueci a senha" por enquanto; o mestre redefine pelo painel do Supabase |
| Artes do RPG | Ficaram para depois: o usuário pega com o mestre. O sistema funciona sem imagens |

### Técnicas

| Decisão | Por quê |
|---|---|
| Next.js 16 + Supabase + Vercel | Tudo no plano grátis, com banco, login, imagens e tempo real prontos |
| **Regras e permissões no banco** (RLS, RPC, trigger) | O front não é confiável: mesmo pela API, ninguém gasta PE errado, edita ficha alheia ou envia imagem sem ser mestre |
| Gastar PE só por RPC | O trigger de travas recusa mudança de PE fora das funções do D100 |
| Imagens em WebP de ~150 KB / 800 px, comprimidas no navegador | Cabem milhares no 1 GB grátis |
| Bucket privado com URLs assinadas de 7 dias | Imagens do RPG não ficam públicas |
| PWA simples (sem modo offline de verdade) | Instala como app; sem internet mostra uma tela avisando |
| Segredos fora do repositório | Só a URL e a publishable key vão ao navegador; a secret key e a senha do Postgres não são usadas |

---

## 4. O que está pronto

### Para o jogador
- Cadastro, login e entrada numa mesa pelo **código de convite**; criação do personagem.
- **Ficha** no visual do Canva:
  - cabeçalho com retrato, nível, caminho, arquétipos e trauma;
  - vida com estado (Estável, Ferido, Instável), defesa, corrupção, congelamento e PE;
  - atributos de Força, Mental e Social, com o valor de cada um;
  - baralho de cartas (arquétipo, trauma, habilidade, revolta);
  - inventário de 4 espaços, com raridade e dentes;
  - conhecimentos (16 áreas);
  - memórias e graças;
  - Enganar a morte (riscado depois de usado).
- **D100:** escolher o atributo, Reforçar antes de rolar, Refazer depois, ver as últimas rolagens.
- **Companheiros:** nome e foto dos colegas de mesa.
- Salvamento automático e sincronização ao vivo.
- **Celular:** layout compacto, alvos de toque grandes, instalável como app (PWA) com dica de instalação.

### Para o mestre
- **Mesa ao vivo:** todas as fichas, rolagens chegando na hora, ajustes rápidos de vida e PE, histórico de alterações.
- Abrir e editar qualquer ficha da mesa, com **travas** do que o jogador pode mudar.
- **Catálogo** de itens e cartas com imagem; **entregar** e **remover** itens e cartas dos jogadores.
- **Várias mesas:** criar, trocar, trazer personagens de outra mesa, tirar da mesa.
- **Morte e memorial:** registrar a morte com epitáfio, ver os mortos, reviver.
- **Imagens:** trocar o retrato de qualquer personagem e as imagens do catálogo; limpeza automática das que sobram.

### Infraestrutura
- Deploy automático na Vercel a cada push no `main`.
- Keep-alive no GitHub Actions a cada 3 dias, para o Supabase grátis não pausar.
- Cabeçalhos de segurança, service worker sem cache, ícones do PWA gerados por script.

---

## 5. Como o código está

### Números
- Cerca de **4.400 linhas** de TypeScript/TSX próprias (sem contar `components/ui` do shadcn), 11 migrations SQL.
- `npx tsc --noEmit`, `npx eslint` e `npm run build` passam limpos (último conferido em 09/11).
- **Não há testes automatizados.** Os testes foram manuais: no navegador, sem login, e pelo usuário, logado.

### Versões principais
Next.js 16.4.3, React 19.3, Tailwind 4, shadcn/ui (`base-nova` sobre `@base-ui/react`), `@supabase/ssr` 0.12,
`@supabase/supabase-js` 2.118, `browser-image-compression`, `sonner`, `zod`, `react-hook-form`.

### Organização
```
app/
  (auth)/entrar, (auth)/cadastro   login e cadastro
  comecar/                         criar ou entrar numa mesa
  (mesa)/ficha, ficha/[id]         ficha do jogador / qualquer ficha (mestre)
  (mesa)/mesa                      painel ao vivo do mestre
  (mesa)/mesas                     trocar de mesa
  (mesa)/catalogo                  itens e cartas do mestre
  actions.ts                       server actions (entrar, cadastrar, sair, criar/entrar/trocar mesa, criar personagem)
  manifest.ts, icon.png, apple-icon.png   PWA
components/
  ficha/   Cabecalho, Vitais, Atributos, Baralho, Inventario, Conhecimento, EnganarMorte,
           MemoriasGracas, Travas, Companheiros, contexto (salvar/sincronizar), rolador (D100)
  mesa/    MesaAoVivo, EntregarItem, HistoricoAlteracoes, TrazerPersonagem, Memorial
  catalogo/Catalogo
  Topo, Moldura, Formulario, Campo, DicaInstalar, RegistrarServiceWorker, ui/ (shadcn)
lib/
  sessao.ts      usuário, mesas, mesa aberta, papel e personagem
  ficha.ts       carrega a ficha completa
  mesa.ts        carrega a mesa do mestre
  conteudo.ts    cartas, inventário, graças, catálogo e URLs assinadas
  imagem.ts      compressão, envio e limpeza de imagens
  ficha-tipos.ts tipos e constantes (4 espaços, limite de congelado 10, custos de PE)
  estado.ts      Estável / Ferido / Instável
  supabase/      clientes do navegador, do servidor e do proxy; nomeCanal()
supabase/migrations/   esquema completo, em ordem
supabase/diagnosticos/ consultas só de leitura
public/                sw.js, offline.html, ícones
scripts/               gerar-icones.mjs + icone-origem.svg
proxy.ts               renova a sessão e manda quem não está logado para /entrar
```

### Como os dados andam
1. **Abrir uma página:** o servidor (Next.js na Vercel) lê a sessão e busca os dados no Supabase com o cookie do
   usuário. O RLS garante que cada um só recebe o que pode ver.
2. **Editar a ficha:** o navegador grava direto no Supabase. Triggers do banco aplicam as travas e registram o histórico.
3. **Rolar o D100:** o navegador chama a RPC `rolar_d100` (e `refazer`). O banco sorteia, cobra o PE e grava a rolagem.
4. **Ao vivo:** o navegador assina o Supabase Realtime (fichas, atributos, inventário, cartas, graças, rolagens,
   alterações). O mestre vê tudo na hora; quando a aba volta a ficar visível, o app recarrega.

### Banco de dados
- **Tabelas (14):** `profiles`, `campanhas`, `membros`, `personagens`, `atributos`, `cartas`, `personagem_cartas`,
  `itens`, `inventario`, `gracas`, `rolagens`, `alteracoes`, `mesa_personagens`, `imagens_descartadas`.
- **Funções que o app chama:**
  - mesas e personagens: `criar_campanha`, `entrar_campanha`, `importar_personagem`, `remover_da_mesa`;
  - morte: `matar_personagem`, `reviver_personagem`;
  - D100: `rolar_d100`, `refazer`, `gastar_pe`;
  - mesa e imagens: `entregar_item`, `colegas_da_mesa`, `imagens_para_apagar`.
- **Funções de permissão:** `is_membro`, `is_mestre`, `is_mestre_do_personagem`, `pode_editar_ficha`,
  `pode_editar_atributos`, `joga_com`, `pode_enviar_retrato`, `pode_ver_retrato`, `pode_ver_catalogo`,
  `pode_descartar_imagem`, `retrato_personagem`.
- **Triggers:**
  - perfil criado no cadastro;
  - ficha nova com valores padrão, atributos e já na mesa;
  - travas;
  - histórico de alterações (ficha, atributos, inventário);
  - limite de memórias por item;
  - ficha morta só leitura;
  - anotar as imagens de uma mesa apagada.
- **Storage:** bucket privado `imagens`, só WebP de até 1 MB. As pastas são `{mesa}/retratos/{personagem}.{carimbo}.webp`
  e `{mestre}/itens|cartas/{id}.{carimbo}.webp`.

### Segurança
- RLS em todas as tabelas; quem não está logado não lê nada (conferido pela API).
- Jogador não altera travas, PE (com a trava ligada), vida máxima travada, dono ou mesa da ficha, nem a ficha de outro.
- Só o mestre envia imagens, e só nas pastas dele.
- Funções internas sem permissão de execução para `anon` e `authenticated`.

### Desempenho (medido em 09/11, perto de Belo Horizonte)

| O quê | Resultado |
|---|---|
| Login e cadastro (páginas em cache) | 100–160 ms |
| Primeira visita no celular | ~305 KB (19 KB de HTML + 286 KB de JS, CSS e fontes); visitas seguintes quase 0 KB |
| API do Supabase (login, banco, Storage) | 45–55 ms |
| Realtime (conectar e assinar) | ~120 ms |
| **Gargalo** | As páginas logadas rodam num servidor da Vercel em **Washington (`iad1`)**, enquanto o banco está muito provavelmente em São Paulo. São uns 120 ms por consulta; abrir a ficha soma de **0,5 a 0,6 s** só de distância |

### Limitações conhecidas
- **Tipos do banco:** são escritos à mão, sem geração automática. Em alguns pontos o código usa `as unknown as`
  porque o supabase-js tipa as relações como listas.
- **Remoção ao vivo:** quando o mestre remove um item ou carta, o jogador com a ficha aberta só vê a mudança ao
  voltar para a aba. O Realtime não filtra exclusões por personagem.
- **Cache de imagens:** as URLs assinadas mudam a cada abertura da ficha, então o celular baixa as imagens de novo toda vez.
- **Ícone:** o do PWA é provisório (engrenagem dourada).

---

## 6. O que será feito

### Depende do mestre ou da mesa
1. **Símbolo oficial do RPG** para o ícone do app: trocar `scripts/icone-origem.svg` e rodar `node scripts/gerar-icones.mjs`.
2. **Artes:** retratos e imagens das cartas e dos itens, que o mestre sobe pelo Catálogo e por "Trocar foto".
3. **Cadastro do Ivan:**
   - cartas O Cuidador, O Órfão, Trauma de Abandono, Agraciado e Incerteza Biológica;
   - itens Arma de Pressão e Ossos Pequenos.
4. **Estrelas ★☆☆☆ dos itens:** falta saber o que medem.

### Testes do usuário
5. Instalar o PWA num Android e num iPhone de verdade.
6. Conferir a limpeza de imagens: trocar uma foto e ver se a antiga some do Storage depois de 1 hora, ao abrir a Mesa.

### Melhorias propostas
7. **Servidores da Vercel em São Paulo** (`vercel.json` com `"regions": ["gru1"]`): a ficha e a Mesa ficam
   ~0,5 s mais rápidas. Proposta em 09/11; o usuário preferiu deixar para depois.
8. **Imagens em cache no celular:** guardar as URLs assinadas no servidor por algumas horas.
9. **Animação do dado**, respeitando quem prefere menos movimento.
10. **Estados vazios, de carregamento e de erro** mais caprichados.

### Técnicas, sem pressa
11. Tipos gerados do banco (`lib/tipos.ts`), que precisam do token do Supabase CLI.
12. "Esqueci a senha".
13. Remoção de itens e cartas ao vivo na ficha do jogador.
14. Keep-alive: o GitHub desliga workflows agendados depois de 60 dias sem commits no repositório.
15. Testes automatizados dos fluxos principais (login, ficha, D100, mesa).
16. Domínio melhor na Vercel; depois, atualizar a Site URL no Supabase.

---

## 7. Como trabalhar no projeto

**Rodar localmente**
1. `npm install`
2. Copiar `.env.example` para `.env.local` e preencher a URL e a publishable key do Supabase.
3. `npm run dev` e abrir http://localhost:3000

**Fluxo de mudanças**
1. Mudança com migration: o usuário roda o SQL no **SQL Editor do Supabase** e avisa, antes do push.
2. Conferir com `npx tsc --noEmit`, `npx eslint` e `npm run build`. Se o build acusar tipos órfãos, apagar `.next/dev`.
3. Commit e push no `main` só com a aprovação do usuário; a Vercel publica sozinha.
4. Atualizar o `CONTEXTO.md` no mesmo commit.

---

## 8. Problemas já enfrentados (e a lição)

| Problema | Solução / lição |
|---|---|
| "new row violates row-level security policy" ao enviar retrato | Dentro de funções de política, `storage.foldername()` e `storage.filename()` falhavam. Ler o caminho com `string_to_array` (`retrato_personagem()`) |
| Vercel sem deploy (DEPLOYMENT_NOT_FOUND) | Um commit vazio disparou o primeiro deploy |
| Keep-alive falhando com URL malformada | Secret colado com espaço; o script agora limpa e valida |
| Erro de tempo real ("cannot add postgres_changes callbacks after subscribe()") | Canais com o mesmo nome colidiam; `nomeCanal()` gera nomes únicos |
| CSS antigo no desenvolvimento | Apagar `.next/dev` e reiniciar |
| Erros do React Compiler | Não chamar hooks depois de `return` condicional; evitar `useMemo` desnecessário |
| `create-next-app` recusou a pasta "RPG" | Nome com maiúsculas; o app foi gerado numa subpasta e movido |

# AGENTS.md — Frontend AutoCareManager

Guia dos padrões implementados. Leia antes de alterar `frontend/`. Quando o contrato da API divergir deste documento, confira o backend e corrija o documento.

## 1. Stack e comandos

React 18, TypeScript 5.6 estrito (noUnusedLocals/noUnusedParameters), Vite 5, React Router 6, TanStack Query 5, Zustand 4 persist, react-hook-form 7 com Zod 3, Recharts 2, sonner e sweetalert2. ESLint 9 flat config, Vitest 3/RTL/Istanbul, Playwright e Storybook 8.

CSS puro com tokens; sem Tailwind. Material UI integra Drawer, Dialog e Card ao tema; sem CssBaseline global. Motion usa `motion/react`.

```sh
npm run dev
npm run build
npm run lint
npm run test:typecheck
npm run test:coverage
npm run test:e2e:coverage
npm run coverage:merge
npm run storybook
npm run build-storybook
```

## 2. Contrato real e escopo

A implementação segue a API em `backend/`, com SQL Server e o schema completo de 31 tabelas (7 da plataforma/backoffice) em database/EstacionamentoDb.sql, para base nova. Vários estabelecimentos compartilham a instalação, com dados e contas separados por EstabelecimentoId. CadastroCliente representa clientes que estacionam. Não há seletor de empresas: cada conta pertence a um estabelecimento.

Endpoints em `/api/v1/`: auth, usuarios, clientes, veiculos, categorias-veiculo, tabelas-preco, taxas-dinamicas, servicos, precos-servicos, estadias, pagamentos, assinaturas, consultas-placa, leitura-placa, configuracoes-integracoes e impressao (mais estadias/{id}/ticket e estadias/{id}/checklist). Clientes têm CPF/CNPJ, enviados como dígitos. Consultas de placa têm GET do histórico e POST de consulta externa, conforme configuração do backend. Leitura-placa recebe JPEG comprimido via multipart para Claude, automaticamente após tirar ou anexar a foto; exige revisão e não persiste a imagem. Pagamentos emitem cobranças avulsas via Asaas (Pix, boleto e fatura de cartão); assinaturas permanecem locais. O backoffice da plataforma usa `/api/v1/backoffice/*` com `api(path, { auth: 'backoffice' })`, sessão própria em `AutoCareManager-backoffice` e rotas `/backoffice/login`, `/backoffice/trocar-senha` e `/backoffice` (assinantes, planos, cobrancas, marketing, integracoes). Não invente endpoints ausentes.

Autenticação Internal por e-mail e senha: dono Admin e funcionários Operador. Cadastro de estabelecimentos aberto por padrão, sem chave; Auth:RegistrationEnabled=false desativa novos cadastros. Senhas de 6 a 128 caracteres; senha provisória exige troca antes de operar. A API emite e valida JWT e revoga sessões no logout, alteração de senha e desativação. External mantém OIDC Authorization Code + PKCE e os perfis legados Financeiro e Cliente; este último usa `cliente_id` confiável. Local é somente JWT do SDK para testes de API. Nunca coloque chaves do backend em VITE_*.

## 3. Estrutura

- `main.tsx`: ErrorBoundary, QueryClient, Router, MaterialTheme e Toaster.
- `App.tsx`: todas as rotas e permissões, páginas lazy.
- `features/<área>/`: página, schemas, API/hooks quando específicos. Use nomes minúsculos plurais, com exceções de áreas como auth/overview/shared.
- `features/shared/`: infraestrutura de recursos reutilizada pelos catálogos.
- `components/`: componentes que conhecem domínio/estado, como AppShell, ResourcePage, RecordForm e RequireAuth.
- `ui/`: primitivos recebendo props, exportados por index.ts, sem conhecimento de domínio.
- `lib/`: apiClient, tipos, erros, formulários, formatação, labels, basePath e swal.
- `stores/`: sessão e tema.
- `styles/global.css`: design system em 14 seções.
- `test/features/`: Playwright; `test/unit/`: Vitest/RTL.

## 4. API e cache

Não use fetch fora de `lib/apiClient.ts`; o ESLint proíbe. Use `api<T>()`, `apiUpload<T>()` e `toQuery()`. O cliente injeta o token, suporta abort, trata 204 e falha de rede e extrai ProblemDetails.

O `code` do erro vem da extensão **code**, não do title humano. Validações expõem fieldErrors. Um 401 autenticado limpa somente a sessão que originou a requisição; resposta atrasada não pode deslogar a sessão nova. Um 401 anônimo preserva o código recebido.

Queries de negócio usam sessionScope (estabelecimentoId:userId); resourceKeys centraliza os catálogos. Hooks específicos usam o mesmo escopo. Troca de token cancela e limpa cache. Nunca envie estabelecimentoId para escolher a empresa na API: ela usa o JWT validado. Retry não insiste em 4xx; staleTime padrão 10s e 60s para seletores/catálogos completos. Use QueryError com retry e estados de loading/vazio.

Mutações invalidam recursos afetados e a visão geral, com toast de sucesso/erro. Os comandos de estadia e financeiros invalidam o escopo do usuário. Listagens usam paginação de 20; filtro local é rotulado “nesta página”. Painel e seletores percorrem todas as páginas (limitação documentada no README). Ao mudar filtro, volte à página 1.

## 5. Formulários

Use react-hook-form, zodResolver e mode onBlur. Schema em arquivo próprio e tipo inferido. RecordForm centraliza campos dos cadastros.

Todo campo registrado precisa repassar forwardRef ao elemento nativo. Campo controlado usa Controller. ID opcional usa toNullableId, texto opcional usa toNullableText. Vazio opcional vira null, nunca ID zero.

Dinheiro usa MoneyField (dígitos para centavos, valor interno number). Converta para valorCentavos apenas nos endpoints que exigem centavos. Valores decimais de preços/serviços permanecem em reais.

Use Field/SelectField/TextAreaField: useId, htmlFor, aria-invalid, descrição e erro associados. Dados inválidos mantêm formulário e erro visíveis. Valores válidos continuam sujeitos à validação autoritativa da API.

## 6. Sessão e rotas

Rotas públicas: /login, /primeiro-acesso, /auth/callback e /sobrenos (página de vendas em features/landing, planos via GET /api/v1/publico/planos). /trocar-senha exige sessão e fica fora do shell. RequireAuth força essa rota para senha provisória. Uma guarda RequireAuth envolve AppShell; permissões por papel ficam em App.tsx e nas ações. O backend continua responsável pela autorização.

authStore persiste `session: {userId,userName,email,estabelecimentoId,estabelecimentoNome,accessToken,expiresAtUtc,roles,mustChangePassword?,authMode?}` sob AutoCareManager-auth. Leia com seletores. Sessão sem estabelecimento positivo ou expirada retorna ao login. A configuração pública fornece mode e registrationEnabled; novos estabelecimentos podem ser cadastrados sem chave mesmo quando outras empresas existem. Não há refresh implementado. OIDC exige a claim assinada estabelecimento_id.

Mantenha um Suspense **dentro do shell**, em torno do Outlet: carregar uma página lazy não pode interromper a transição do Drawer móvel.

Links usam Router. Fora dele, use appPath/BASE_PATH. VITE_BASE_PATH configura subdiretório (padrão /); VITE_API_BASE_URL configura a API independentemente. Nunca inclua secrets em VITE_*.

## 7. Design, tema e acessibilidade

Tokens de fundo: --bg/--bg-raise/--bg-press; borda: --line/--line-soft; texto: --ink/--ink-dim/--ink-faint; marca: --mint/--mint-deep/--mint-ink. Use tokens de status, --viz-_, --radius_, --gap* e --duration-* existentes. Alvos usam --touch (48px).

Tema é escolha persistida, escuro por padrão, via data-theme. O claro usa :root[data-theme="light"]; não use prefers-color-scheme. MaterialTheme segue themeStore.

Gráficos usam ordem fixa de cores, eixo único, rótulos/legenda e opção Ver tabela. Não use cor como único significado. Atualmente há uma série de entradas ou recebimentos. Não declare testes quantitativos de daltonismo que não tenham sido executados; revalide contraste e distinção ao adicionar séries.

Modal usa Dialog MUI com foco confinado/restaurado, Esc, título acessível e busy. Botões ficam em Modal.actions e apontam ao formId; campos são roláveis. Confirmação sobre um Dialog deve ser inline para evitar competição de foco com SweetAlert.

Primitivos novos ganham story. Erros usam role alert, carregamento role status. Elementos interativos/verificados recebem data-testid. Não duplique controles para desktop/mobile.

## 8. Motion e responsividade

MaterialTheme configura LazyMotion e MotionConfig reducedMotion=user; use m dentro desse provider. Entrada de página dura 180ms; useReducedMotion também elimina fade. Não anime valores financeiros ou atrase ações. Drawer/Dialog mantêm transições MUI.

Breakpoints: 600, 900 e 1200px. Drawer temporário abaixo de 900; tabelas viram cartões abaixo de 1200. Grids usam mínimos que cabem na largura. Campos móveis usam 16px. Modal acompanha visualViewport, tem fallback dvh e safe areas.

Valide 320, 390, 768, 1024 e desktop1440, nomes longos, alturas pequenas, tema claro/escuro e zoom; não esconda overflow da página para mascarar problemas. Veja test/RESPONSIVENESS.md.

Smart POS: o bloco `@media (max-width: 480px), (max-height: 720px) and (max-width: 900px)` (seção 23 do CSS) esconde o texto institucional do login e as descrições das páginas, e mantém botões e campos com --touch. `lib/device.ts` mantém o campo em foco visível quando o teclado abre e trata o Voltar do Android. Avisos ficam no topo abaixo de 600 px. Teste em 320×533, 360×640 e 480×800 (test/features/auth/pos.spec.ts).

App Android: Capacitor em `frontend/android` (versionado), build `npm run build:android` (modo `android` do vite.config.ts: base `/`, API https remota, sem source maps, alvo Chrome 87). `isNativeApp()` oculta o download do APK dentro do app. Veja ANDROID.md.

## 9. Testes e CI

Vitest/RTL verifica comportamento, erros, sessão, formulários e acessibilidade. Storybook não substitui asserções.

Playwright isolado inicia Vite5175 e BrowserHost5081. Cada teste possui ApiFactory da WebApi real e SQLite em memória independente, com token efêmero. Não toca SQL Server de produção. BrowserHost só escuta no loopback e nunca deve ser publicado.

Fixture grava sessão **uma vez** com page.evaluate. Não use addInitScript para reinjetar tokens, pois isso mascara logout. Abra nav-open no mobile e aguarde a tela antes das ações. DataTable recebe testId; linhas são testId-row. SweetAlert confirma por .swal2-confirm.

Modo opcional test:e2e requer BrowserHost/Vite previamente iniciados e E2E_PREPARED=true; não é um runner contra produção. Consulte test/README.md.

CI exige lint, build, tipos de testes, unitários, Playwright desktop/mobile, cobertura combinada e build Storybook. Unit e E2E precisam corresponder à mesma revisão para coverage:merge. LCOV fica em coverage/merged/lcov.info. SonarCloud requer configuração externa.

## 10. Antes de entregar

- Build, lint, tipos, testes e Storybook passam.
- Query keys com userId; troca de sessão sem vazamento de cache.
- Erros por código, fetch apenas no cliente HTTP.
- Campos com ref e conversões de null; dinheiro conforme contrato.
- Ações permitidas pelo backend, sem endpoints inventados.
- Claro/escuro e mobile revisados, gráfico com tabela.
- Sem any para contornar tipos; sem credenciais no bundle.
- README e testes atualizados com o comportamento real.

Integrações: hub em /integracoes (cards) e detalhe em /integracoes/:integracao?tab=… (abas com ícone via ui/Tabs, formulário isolado por aba; catálogo em features/integrations/catalog.ts). GET/PUT configuracoes-integracoes/{claude|consulta-placa|asaas} exclusivos de Admin. Configurações sempre no banco por estabelecimento; respostas nunca trazem segredos. Campos secretos vazios mantêm a credencial; remoção explícita requer desativar. Versao evita sobrescrita concorrente. Não há fallback de configuração em arquivo. Claude, Consulta de placas e Asaas priorizam a credencial própria ativa e preenchida; na ausência, usam a configuração ativa do backoffice. O seletor manual foi removido. O endpoint origem permanece legado sem efeito sobre a seleção. origem/disponivel mostram a configuração efetiva, sem segredos. Asaas compartilhado recebe na plataforma com repasse manual.

Impressão: rota /impressao (Admin) com preferências (ui/Switch). `imprimirPeloNavegador` e `larguraPapelNavegadorMm` (58/80) são persistidos por estabelecimento com `versao`; padrão do navegador é false. No modo navegador, não exige token/impressora cadastrada: GET autenticado `estadias/{id}/ticket` retorna `{larguraPapelMm,ticket}` com QR assinado e layout do servidor, sem enfileirar. `browserPrinting` monta ticket térmico em iframe, abre o diálogo do sistema e não declara impressão física nem status IMPRESSO. Após entrada, EntryModal segue `acaoAposEntrada` se `impressaoEntradaDisponivel`; PERGUNTAR usa confirmação inline no Dialog e IMPRIMIR abre o diálogo após salvar. Falha permite repetir só a impressão, sem cadastrar a entrada outra vez. StayDetails oferece Imprimir ticket. No modo agente, mantém token exibido uma vez, CRUD de impressoras e histórico; teste exige contato recente. `impressaoAutomaticaNoServidor` evita POST de ticket duplicado após entrada. O navegador ativo suspende novos trabalhos e reservas da fila; voltar ao agente pode consumir pendentes antigos. Não reutilize dados de impressão após troca de sessão. O app Android usa o agente nativo; navegador exige abrir no browser do computador. Aplicar a migração backend `20261029_ImpressaoNavegador.sql` antes de publicar API/frontend; Azure Linux fornece dados e a impressão ocorre na máquina cliente.

Checklist veicular: StayDetails mostra o resumo e abre `features/checklist/ChecklistModal` (Dialog `size="lg"`). Não bloqueia a entrada: sem checklist salvo e com a estadia aberta abre o formulário; com checklist abre o relatório e, enquanto a estadia está aberta, "Editar checklist". Cabeçalho (placa, veículo, cliente, telefone) vem do GET; Km e última manutenção são editáveis. Itens com escolha Bom/Ruim/Faltante (toque de novo limpa; "Outro" exige descrição). O mapa de avarias (`DamageMap`, SVG com 5 vistas) grava posição em % da vista, então funciona em qualquer largura; Enter marca no centro. O PUT substitui tudo e envia `versao` (409 em edição concorrente). Descartar alterações usa confirmação inline.

E-mails do backoffice: /backoffice/emails lista templates e destinatários (administradores dos estabelecimentos), permite seleção explícita de até 1.000 IDs e confirmação. GET backoffice/emails e POST backoffice/emails/enfileirar. Não confundir aceite pelo provedor com entrega. Opções manuais BOAS_VINDAS, ORIENTACAO_ASAAS e AMBOS são independentes; Asaas manual libera também PENDENTE. A fila não repete mensagens aceitas/incertas. A sequência automática do cadastro mantém 30 minutos após o aceite das boas-vindas.

Entrada de veículo: o fluxo por foto/manual reutiliza a placa já cadastrada no estabelecimento, sem alterar cliente ou dados existentes. Apenas veículo novo exige categoria para criação. A confirmação da entrada continua sujeita à validação do backend contra estadia em andamento; histórico encerrado não impede nova entrada.

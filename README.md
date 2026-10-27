# CareAuto — Frontend

Interface React 18 + TypeScript para a API de estacionamento existente. Inclui visão geral, clientes, veículos, categorias, tabelas de preços, taxas dinâmicas, serviços e preços, estadias com serviços/saída/cancelamento, pagamentos, assinaturas e histórico de consultas de placa.

## Desenvolvimento

Requisitos: Node.js 22+, npm e backend .NET 9 configurado conforme [README do backend](../backend/README.md).

```sh
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

No PowerShell, use `Copy-Item .env.example .env.local`. O Vite atende em http://localhost:5173 e encaminha `/api` para `http://localhost:5080`. Inicie o backend no Visual Studio com o perfil **AutoCareManager.WebApi** (HTTP na porta 5080), ou execute `dotnet run --project src/AutoCareManager.WebApi --launch-profile AutoCareManager.WebApi` a partir de `backend`. Ajuste `API_PROXY_TARGET` se usar outra porta e reinicie o Vite após mudar o `.env.local`. Nenhum banco é criado ou alterado pelo frontend.

Se o login mostrar “Não foi possível carregar a configuração de acesso”, verifique se a API está executando. `http://localhost:5173/api/v1/auth/configuracao` deve retornar JSON com `mode` e `registrationEnabled`; essa consulta não depende do banco. Após atualizar o perfil de inicialização, reinicie a API para aplicar a porta.

### Autenticação

O modo Internal oferece login por e-mail e senha para vários estabelecimentos, cada um com suas próprias contas. Prepare a base nova conforme [Contas e estabelecimentos](../backend/CONTAS.md). Em **Cadastrar meu estabelecimento**, informe o negócio (CPF/CNPJ), seu dono, e-mail e senha de pelo menos 6 caracteres, sem chave de cadastro. O dono gerencia apenas seus funcionários em **Equipe e acesso**; a senha provisória deve ser trocada antes de operar. E-mail de conta é único no sistema. Chaves do backend não pertencem ao `.env` do frontend.

Para usar o modo opcional External, configure no provedor um cliente público SPA com Authorization Code + PKCE (sem client secret), permitindo o redirect `http://localhost:5173/auth/callback` e a origem do frontend.

Defina em `.env.local`:

- `VITE_OIDC_AUTHORITY`: issuer/authority do provedor.
- `VITE_OIDC_CLIENT_ID`: cliente público da SPA.
- `VITE_OIDC_SCOPE`: scopes necessários; padrão `openid profile email`. Inclua o scope da API quando o provedor exigir.
- A audience do access token deve corresponder ao `Jwt:Audience` do backend.
- JWT com `sub`, `exp`, `estabelecimento_id` positivo e claim `role` (string ou array) contendo `Admin`, `Operador`, `Financeiro` ou `Cliente`. O provedor pode enviar `estabelecimento_nome` para apresentação. O perfil Cliente também precisa do `cliente_id` confiável exigido pela API.

As variáveis OIDC são necessárias apenas no modo External. O frontend consulta a configuração pública da API para escolher o fluxo. O backend decide as permissões; esconder ações na UI é apenas conveniência. No modo Internal, sair revoga as sessões da conta no servidor e remove a sessão local. No modo External, sair remove a sessão local; a sessão SSO continua sujeita às regras do provedor. Quando o token expira, o usuário entra novamente.

## Comportamentos

- Tema escuro inicial, tema claro persistido e movimento reduzido respeitado.
- O nome do estabelecimento aparece na navegação. Sessão e cache incluem empresa/usuário; logout e novo login não reutilizam dados da outra empresa. Contas sem estabelecimento válido precisam entrar novamente.
- Drawer móvel abaixo de 900px; tabelas viram cartões abaixo de 1200px.
- No login por senha, Administrador gerencia o negócio e a equipe; Funcionário (role Operador) acompanha operação e clientes. Os perfis legados Financeiro e Cliente continuam disponíveis para o modo External.
- CPF/CNPJ são enviados como dígitos conforme o contrato de clientes. Valores monetários são números; pagamentos e assinaturas convertem para centavos na borda da API.
- Listagens de cadastro usam paginação de 20 itens; a busca indica explicitamente que filtra a página atual. Painel, estacionamento e seletores percorrem as páginas da API para compor a visão completa.
- Pagamentos podem emitir cobranças avulsas Asaas após o registro local. Tentativas de emissão bloqueiam confirmação/cancelamento local e permitem conciliação no provedor. Assinaturas continuam como registros locais.
- Consultas de placa mostram o histórico; o cadastro consulta o serviço configurado no backend via `POST /api/v1/consultas-placa`.
- O Administrador cria, edita, desativa funcionários e redefine suas senhas. Não há recuperação de senha por e-mail, planos comerciais ou backoffice separado.

O painel e os seletores atualmente carregam todas as páginas necessárias. Bases muito grandes devem ganhar endpoints agregados e busca remota antes de ampliar o volume operacional.

## Qualidade

### Foto da placa e entrada

Em **Veículos → Adicionar veículo**, use **Tirar foto** (câmera traseira em dispositivos compatíveis) ou **Anexar foto da placa**. No computador, o seletor de arquivos permite testar JPG, PNG e WebP de até 20 MB. Fotografe de perto; imagens acima de 40 megapixels são rejeitadas. A captura depende do suporte do navegador ao atributo `capture`; quando não suportado, ele abre o seletor de arquivos.

Antes da leitura, `preparePlateImage` remove metadados EXIF/localização e gera JPEG de até 512 KB. A meta é 200 KB, com qualidade de 86% a 70%, até 1568px no maior lado e 1,2 megapixels. Fotos menores não são ampliadas; dimensões e proporção são preservadas quando já cabem nos limites. Para fotos difíceis, priorize enquadrar somente a placa: compressão não recupera caracteres ausentes. A interface mostra o tamanho original e preparado e usa a foto preparada na prévia e no envio. O limite de 512 KB pode prevalecer sobre a meta de 200 KB para preservar legibilidade; nenhum original é enviado.

Ao tirar ou anexar uma foto, a leitura pelo Claude começa automaticamente após a compressão. Somente o JPEG preparado é enviado ao backend e à Anthropic; requer chave e saldo de API. O CareAuto não persiste a imagem. Assim que o Claude devolve uma placa válida, a consulta de dados do veículo é disparada automaticamente (uma vez por placa; o botão **Consultar** mostra o carregamento e permite repetir a consulta após editar). Marca, modelo, cor e situação são preenchidos apenas nos campos ainda não alterados pelo operador. Se o provedor informar tipo/carroceria correspondente a uma categoria ativa, **Categoria** é selecionada automaticamente quando estiver vazia; caso contrário, permanece vazia. Ao alterar a placa, as sugestões automáticas são desfeitas. Cada consulta automática pode gerar cobrança no provedor de placas, mesmo que a leitura precise de correção. Não há OCR local, botão separado de leitura nem repetição automática de chamadas pagas. Para tentar novamente, anexe ou tire outra foto. Configure conforme [Leitura de fotos com Claude](../backend/README.md#leitura-de-fotos-com-claude).

A extração aceita placas antigas e Mercosul. Leituras ambíguas ou com múltiplas placas permitem digitação manual; uma placa válida deve ser conferida antes da consulta. Editar a placa e sair do campo dispara nova consulta. Marca, modelo, cor e situação retornados são editáveis; respostas antigas não substituem uma placa nova nem campos editados durante a espera. Falha ou falta de configuração permite continuar manualmente. Configure o provedor conforme o [backend](../backend/README.md#consulta-externa-de-placas).

Em **Estacionamento → Registrar entrada → Adicionar veículo por foto ou manualmente**, o mesmo formulário salva o veículo e o seleciona para entrada. A tabela e a observação já escolhidas são preservadas. O cadastro fica salvo mesmo se o usuário cancelar a entrada; uma falha ao registrar a estadia permite tentar novamente sem duplicar o veículo.

### Verificações

```sh
npm run lint
npm run build
npm run test:typecheck
npm run test:coverage
dotnet restore ../backend/test/AutoCareManager.BrowserHost --configfile ../backend/NuGet.Config
npx playwright install chromium
npm run test:e2e:coverage
npm run coverage:merge
npm run build-storybook
```

Veja [test/README.md](test/README.md) e [test/RESPONSIVENESS.md](test/RESPONSIVENESS.md). CI em `.github/workflows/frontend.yml` executa os gates. O relatório combinado fica em `coverage/merged/index.html`; LCOV em `coverage/merged/lcov.info`.

Neste computador, caso o comando `npm` aponte para uma instalação antiga, use `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run <script>`.

## Publicação

`npm run build` gera `dist/`. O servidor deve servir arquivos estáticos e retornar `index.html` nas rotas da SPA. Encaminhe `/api` ao backend; o proxy do Vite só existe em desenvolvimento. Alternativamente, configure `VITE_API_BASE_URL` com a origem da API e autorize a origem do frontend no CORS do backend.

Para hospedar em `/AutoCareManager/`, defina `VITE_BASE_PATH=/AutoCareManager/` **antes do build**. No modo External, registre também o callback `https://seu-dominio/AutoCareManager/auth/callback` no provedor. O caminho da API é independente do basename da SPA.

Variáveis `VITE_*` são públicas e incorporadas ao bundle: nunca coloque senhas, connection strings, client secrets ou chaves Asaas nelas. Aplique HTTPS na infraestrutura de produção. O host `backend/test/AutoCareManager.BrowserHost` serve exclusivamente aos testes e não deve ser publicado.

### Painel de Integrações

Administradores acessam **Configurações → Integrações**, um hub com um card por serviço (ícone, descrição e situação Ativada/Desativada). Cada card abre `/integracoes/{claude|consulta-placa|asaas}`, com abas de ícone na URL (`?tab=credenciais|configuracoes|webhooks|status`): Claude e Consulta de placas têm Credenciais, Configurações e Status; Asaas tem Credenciais, Webhooks (guia de cadastro) e Status (com teste de conexão). Cada aba tem formulário, validação e botão Salvar próprios: o PUT envia os campos da aba sobre os valores salvos das demais, e trocar de aba descarta o rascunho não salvo. No Asaas, chave de API e token do webhook ficam juntos em Credenciais porque o backend exige os dois para ativar e ao trocar de ambiente.

Integrações configuradas por estabelecimento: Credenciais são enviadas somente ao salvar, não retornam na consulta nem ficam no armazenamento do navegador. Campo vazio mantém a credencial existente; a opção Remover requer desativar. Alterações valem na próxima consulta. Execute a migração e os inserts descritos no README do backend antes de usar o painel.

### Checklist veicular

Nos detalhes da estadia, **Realizar checklist** (ou **Ver checklist**) abre o formulário sem bloquear a entrada. O cabeçalho traz placa, veículo, cliente e telefone; Km atual e última manutenção são editáveis. Cada item recebe Bom, Ruim ou Faltante (toque de novo para limpar). No mapa, escolha A (amassado), R (riscado), X (quebrado) ou F (faltante) e toque no ponto da vista superior, laterais, frente ou traseira; cada marcação aceita observação e pode ser removida. Depois de salvo, o checklist aparece como relatório e pode ser editado enquanto a estadia estiver aberta; após a saída ou o cancelamento, fica somente leitura.

### Impressão de tickets

Em **Configurações → Impressão** (Admin): escolha se a entrada pergunta "Deseja imprimir o ticket de estacionamento?" ou imprime automaticamente, gere o token do agente (exibido uma vez), cadastre impressoras USB (nome do driver no Windows) ou de rede (IP e porta 9100) e acompanhe as últimas impressões. A pergunta só aparece quando há token e impressora de entrada ativa; a estadia aberta também oferece **Imprimir ticket**. O ticket sai pelo agente local descrito em [backend/src/AutoCareManager.PrintAgent/README.md](../backend/src/AutoCareManager.PrintAgent/README.md).

Asaas: configure ambiente e credenciais no painel Integrações (Admin). Em Pagamentos, registre o pagamento com cliente e use Emitir no Asaas. A fatura hospedada aceita o meio escolhido; Pix permite copiar o código. Atualizar cobrança e Cancelar no Asaas exigem Admin/Financeiro. O botão de confirmação local é ocultado assim que a emissão é reservada. Detalhes de instalação e webhook: [backend/ASAAS.md](../backend/ASAAS.md).

### App Android e Smart POS

O APK (Capacitor) traz o frontend embarcado e usa a API remota. Ao abrir a tela de login em um navegador Android, o app tenta iniciar o download do APK automaticamente e mantém **Baixar para Android** como alternativa caso o navegador bloqueie a tentativa. O Android ainda pede confirmação para baixar/instalar. Dentro do APK instalado, o link de download fica oculto. O workflow `mobile.yml`, chamado pelo CD, gera e publica o APK e o pacote PWA para iPhone. Em telas de maquininha (até 480 px de largura ou até 720 px de altura), o layout prioriza o formulário e as ações. Build e secrets em [ANDROID.md](ANDROID.md) e [../mobile/README.md](../mobile/README.md).

### Página de vendas

Em `/sobrenos` (produção: `/autocare/sobrenos`), é a página de entrada das campanhas. Apresenta as funcionalidades, os planos ativos do backoffice e as perguntas frequentes, e os botões levam ao cadastro em `/primeiro-acesso`. O conteúdo fica em `src/features/landing/content.ts`: mantenha ali só o que o produto realmente faz.

### Backoffice da plataforma

Em `/backoffice` (produção: `/autocare/backoffice`), com login inicial admin/123456 e troca obrigatória da senha. A sessão é separada da do estacionamento. Detalhes em [backend/BACKOFFICE.md](../backend/BACKOFFICE.md).

Recuperação de senha: o login Internal oferece “Esqueci minha senha” em `/recuperar-senha`. Usa o e-mail cadastrado, mostra confirmação genérica e orienta sobre os 30 minutos de validade. A API depende da ativação descrita em [EMAILS.md](../backend/EMAILS.md).



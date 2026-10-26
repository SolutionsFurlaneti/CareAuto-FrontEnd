# Testes do frontend

## Unitários e componentes

`npm run test:coverage` executa Vitest + React Testing Library com Istanbul. Verifica injeção de token, 401 autenticado/anônimo, resposta tardia de sessão anterior, ProblemDetails, validação, rede/abort, conversores, MoneyField, registro de ref com react-hook-form, acessibilidade do modal e guardas de acesso. O setup fornece Storage e matchMedia completos no ambiente jsdom.

`npm run test:typecheck` valida os tipos dos testes separadamente.

## Navegador com API isolada

```sh
dotnet restore ../backend/test/AutoCareManager.BrowserHost --configfile ../backend/NuGet.Config
npx playwright install chromium
npm run test:e2e:coverage
```

O runner inicia Vite em 5175 e o host de testes em 5081, compilado em Release para não disputar os arquivos Debug da API aberta no Visual Studio. O host encaminha as chamadas para a WebApi real com a ApiFactory usada pelos testes do backend. Cada teste recebe **seu próprio banco SQLite em memória** e JWT efêmero assinado. Nada acessa o SQL Server fornecido. Não há interceptação ou mock das respostas HTTP do aplicativo.

O host só escuta no loopback. `/__test/session` e `/__test/advance` existem nesse projeto de testes, nunca na API de produção. Não publique BrowserHost.

A fixture grava a sessão uma vez usando `page.evaluate`; não usa `addInitScript`, portanto logout e expiração não reinjetam um token. Os dados são descartados ao terminar cada teste.

O cenário de contas usa o modo Internal e faz o primeiro cadastro e os logins pela interface, sem injetar sessão: cadastra o dono sem chave, cria funcionário, rejeita senha incorreta, exige troca de senha provisória, verifica permissões e redefine/desativa o acesso. As senhas desses fluxos têm exatamente 6 caracteres.

Outro cenário cadastra duas empresas na mesma API/banco, cria clientes com o mesmo CPF e dados próprios, verifica a equipe de cada uma e volta ao login da primeira empresa sem reaproveitar o cache da segunda. Ambos rodam em desktop e mobile.

São exercitados desktop e mobile, clientes (validação/criação/edição/desativação), veículo sem proprietário, configurações, assinatura/encerramento, permissões, sessão, temas e fluxo completo de estadia → serviço → saída → pagamento confirmado.

Para usar o Edge instalado no Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e:coverage
```

Modo local preparado: inicie o mesmo BrowserHost manualmente e o Vite com `API_PROXY_TARGET=http://127.0.0.1:5081`; defina `E2E_PREPARED=true` e execute `npm run test:e2e`. Esse modo também requer o host de testes, não uma API de produção. `E2E_BASE_URL` substitui a origem da aplicação.

## Cobertura e artefatos

Os testes de preparação da imagem verificam proporção, resolução, limites, JPEG e limpeza de recursos. Os testes de `PlateCapture` verificam que Claude é chamado automaticamente após anexar ou capturar uma foto, recebe apenas o JPEG preparado, exige revisão e não substitui edição manual durante a espera. O teste de navegador envia um JPEG real ao backend isolado e verifica o caso sem chave; não chama a Anthropic.

`test/unit/plateCapture.test.tsx` cobre padrões de placa, correção manual, respostas atrasadas, edição durante a consulta, cancelamento de fotos anteriores, falha de rede, leitura ambígua e arquivo inválido. A preparação da foto e o cliente HTTP são substituídos nesses testes de componente.

`test/features/catalog/plate-photo.spec.ts` verifica o envio automático do JPEG com resposta de leitura controlada, cadastro e entrada pela API de teste em desktop/mobile; também envia uma imagem ao backend real isolado sem chave, valida a alternativa manual e inspeciona os controles no tema claro em 320, 390, 768, 1024 e 1440px. Não chama a Anthropic nem mede precisão do modelo. A câmera física e os provedores externos devem ser homologados no ambiente de uso.

Execute os testes unitários e E2E **na mesma revisão** antes de `npm run coverage:merge`. Fontes de produção são instrumentadas apenas com `COVERAGE=true`.

- `coverage/unit/coverage-final.json`: Vitest/Istanbul.
- `coverage/e2e/*.json`: coleta ao final de cada sessão de navegador.
- `coverage/merged/index.html`: relatório conjunto.
- `coverage/merged/lcov.info`: importável no SonarCloud via `sonar.javascript.lcov.reportPaths`.
- `playwright-report/` e `test-results/`: resultado, traces de falhas e imagens dos temas.

A cobertura não equivale a validação do provedor OIDC real, do SQL Server ou de todas as combinações do domínio. A integração OIDC real depende das configurações do ambiente e deve ser validada ao conectar o provedor. A suíte isolada usa os mesmos endpoints, handlers e validações da WebApi.

CI executa build, lint, tipos, unitários, navegador e Storybook. Envio ao SonarCloud depende das credenciais/configuração do repositório; o relatório LCOV está pronto para essa integração.

O cenário integrations.spec.ts salva as duas configurações pela API real isolada, verifica persistência após recarregar, preservação de chave omitida, remoção explícita e layout responsivo. permissions.spec.ts também rejeita acesso de Operador ao painel. Nenhuma consulta paga é executada.

Asaas: test/unit/asaas.test.tsx verifica controles financeiros e URLs seguras; test/features/catalog/asaas.spec.ts valida configuração e emissão/cancelamento Pix no navegador com API real isolada e gateway simulado. O BrowserHost injeta esse gateway em todas as sessões, impedindo cobrança real.

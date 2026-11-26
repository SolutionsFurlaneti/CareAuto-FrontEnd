# SEC-CAR-035 — cabeçalhos e descoberta de recursos

## Evidências e escopo

Baseline: relatório RouteSentinel, execução **35**, concluída em **26/11/2026 às 21:15:56 UTC**, organização 2, alvo 23 (`https://careauto.online`), perfil 7. Foram concluídas 623 verificações: o controle de caminho ausente (#2214) faz parte da cobertura, mas é excluído do resumo de 622 resultados. O resumo contém 0 exposições confirmadas, 596 conformes, 23 requer análise e 3 inconclusivos.

Os 23 apontamentos retornavam `200 text/html`. A verificação independente anterior à mudança confirmou que todos os 23 corpos eram idênticos ao HTML de `/` por SHA-256. Isso demonstra fallback da SPA para esses caminhos; não demonstra publicação de chaves, certificados, arquivos SSH ou WordPress. A ausência dos cabeçalhos nessa resposta era uma lacuna real de configuração.

O frontend é publicado no Azure Static Web Apps. A API é um serviço separado em `https://api.careauto.online`, servido por Nginx na VM. Não foi criado um proxy `/api` no domínio do frontend, nem novos endpoints de diagnóstico.

## Implementação

- `public/staticwebapp.config.json` centraliza CSP, `X-Frame-Options: SAMEORIGIN`, `nosniff`, HSTS de um ano e política de referrer para o frontend. As rotas da aplicação continuam com fallback; recursos inexistentes, diagnósticos legados e arquivos sensíveis saem desse fallback.
- A resposta 404 própria usa `public/404.txt`: mantém status 404 e os cabeçalhos globais, sem scripts ou detalhes internos. A página 404 padrão do Azure não recebia os cabeçalhos globais na validação real.
- O MIME de `.txt` é configurado explicitamente como `text/plain; charset=utf-8`: o Azure sobrescrevia o `Content-Type` configurado apenas nos headers da rota.
- O inicializador do Google foi movido para `public/google-tag.js` e é carregado antes da biblioteca assíncrona. `script-src` não libera `unsafe-inline` nem `unsafe-eval`; as origens de script são explícitas. Os estilos inline permanecem autorizados para MUI/Emotion, estilos React e documentos de impressão. `frame-ancestors 'self'` combina com `SAMEORIGIN`, preservando os iframes de impressão e prévias de e-mail.
- Imagens e vídeos HTTPS mantêm o contrato do catálogo; YouTube sem cookies e Vimeo têm origens de frame explícitas. A API real e as origens Google necessárias ficam em `connect-src`. Uma nova origem de API/OIDC exige revisão explícita da política.
- O host Express opcional lê a mesma política, mantém HSTS apenas para HTTPS (incluindo proxy de loopback confiável), bloqueia arquivos privados e evita responder HTML da SPA a recursos inexistentes. O desenvolvimento Vite/Storybook não recebe a CSP de produção.
- O backend possui snippets Nginx próprios: CSP restritiva para JSON, framing negado, `nosniff`, HSTS somente em TLS real e `always` em todas as respostas. A única exceção de estilos preserva a página HTML existente de opt-out. O helper de implantação preserva os dois blocos geridos pelo Certbot e seus certificados.

O canal oficial de reporte é o WhatsApp de atendimento já divulgado no site e confirmado pelo responsável. `Expires` é **2027-05-26T23:59:59Z**; revisar antes dessa data. `/security.txt` redireciona permanentemente para `/.well-known/security.txt`, que possui `Canonical` e idiomas preferidos. Não foram alterados schema, senhas ou regras de autenticação nesta entrega.

## Revisão dos 23 apontamentos

O status posterior abaixo descreve a correção HTTP, confirmada na execução 37 e na auditoria independente. A classificação do RouteSentinel está discriminada adiante; ela não equivale ao status HTTP. Todos os caminhos abaixo recebem os quatro cabeçalhos de segurança.

| ID baseline | Caminho                                   | Antes            | Tratamento posterior                           |
| ----------: | ----------------------------------------- | ---------------- | ---------------------------------------------- |
|        1633 | `/.well-known/security.txt`               | 200, HTML da SPA | 200, texto UTF-8 com Contact/Expires/Canonical |
|        1668 | `/apple-app-site-association`             | 200, HTML da SPA | 404; associação não publicada                  |
|        1708 | `/build.txt`                              | 200, HTML da SPA | 404; metadado não publicado                    |
|        1715 | `/CHANGELOG.md`                           | 200, HTML da SPA | 404; documento não publicado                   |
|        1847 | `/favicon.ico`                            | 200, HTML da SPA | 404; ícone real é `/favicon.svg`               |
|        1856 | `/fullchain.pem`                          | 200, HTML da SPA | 404; não é um recurso público do frontend      |
|        1887 | `/healthz`                                | 200, HTML da SPA | 404; health real é `/health/live` na API       |
|        1909 | `/info`                                   | 200, HTML da SPA | 404; diagnóstico inexistente                   |
|        1910 | `/_info`                                  | 200, HTML da SPA | 404; diagnóstico inexistente                   |
|        1979 | `/oauth/token`                            | 200, HTML da SPA | 404; não há token endpoint neste host          |
|        2059 | `/security.txt`                           | 200, HTML da SPA | 301 para o arquivo canônico, depois 200        |
|        2083 | `/sitemap.xml`                            | 200, HTML da SPA | 404; sitemap não publicado                     |
|        2097 | `/.ssh/authorized_keys`                   | 200, HTML da SPA | 404; caminho privado bloqueado                 |
|        2099 | `/.ssh/id_rsa.pub`                        | 200, HTML da SPA | 404; caminho privado bloqueado                 |
|        2103 | `/status`                                 | 200, HTML da SPA | 404; diagnóstico inexistente                   |
|        2104 | `/_status`                                | 200, HTML da SPA | 404; diagnóstico inexistente                   |
|        2155 | `/_version`                               | 200, HTML da SPA | 404; versão interna não publicada              |
|        2156 | `/version`                                | 200, HTML da SPA | 404; versão interna não publicada              |
|        2170 | `/.well-known/apple-app-site-association` | 200, HTML da SPA | 404; associação não publicada                  |
|        2171 | `/.well-known/openid-configuration`       | 200, HTML da SPA | 404; este host não é um emissor OIDC           |
|        2197 | `/wp-cron.php`                            | 200, HTML da SPA | 404; não há WordPress                          |
|        2201 | `/wp-json/wp/v2/users`                    | 200, HTML da SPA | 404; não há WordPress                          |
|        2209 | `/xmlrpc.php`                             | 200, HTML da SPA | 404; não há XML-RPC                            |

## Três inconclusivos do baseline

|   ID | URL testada no frontend        | Verificação no host correto                                              |
| ---: | ------------------------------ | ------------------------------------------------------------------------ |
| 1659 | `/api/health` → 404            | `https://api.careauto.online/health/live` → 200, somente `{status:"ok"}` |
| 1664 | `/api/v1/publico/planos` → 404 | `https://api.careauto.online/api/v1/publico/planos` → 200                |
| 1665 | `/api/v1/version` → 404        | Mesmo caminho na API → 404; endpoint não implementado                    |

O avaliador de cabeçalhos do RouteSentinel classifica respostas fora de 200–399 como **inconclusivas**. Assim, trocar o falso 200 por um 404 correto pode reduzir “Requer análise” e aumentar “Inconclusivo”. Isso não deve ser apresentado como resultado “Conforme”, falha de comunicação ou exposição confirmada. A auditoria independente também inspeciona cabeçalhos dos 404, cobrindo essa limitação do avaliador.

O avaliador de `security.txt` também não segue o redirecionamento do caminho legado. Na execução 37, o arquivo canônico foi classificado como **Conformant**, com Contact suportado e Expires futuro; `/security.txt` foi classificado como **Inconclusive**, com HTTP 301. O redirecionamento para o arquivo canônico é intencional e foi validado por um cliente que o segue, além de conferir os quatro cabeçalhos na própria resposta 301. Esse resultado não será contado como conforme no comparativo do scanner.

## Verificação reproduzível

```sh
npm run lint
npm run test:typecheck
npm run test:coverage
npm run build
npm run build-storybook
node scripts/audit-web-security.mjs --origin=https://careauto.online --api-origin=https://api.careauto.online --output=artifacts/security-035/production-after.json
```

No build publicado, definir `VITE_API_BASE_URL=https://api.careauto.online` e `VITE_BASE_PATH=/`. Não reutilizar essas variáveis de build no processo de testes que espera URLs relativas. A URL da API não contém credenciais nem o sufixo `/api/v1`.

Os testes HTTP verificam respostas reais de sucesso, redirecionamento e erro, proteção de arquivos privados mesmo quando presentes, navegação legítima, condição HTTPS para HSTS e conteúdo distinto do security.txt. O smoke Chrome com CSP efetiva cobre MUI, login, ordem do Google, ticket sintético de 58 mm, e-mail sandbox e frames dos tutoriais, em `/` e `/autocare/`; scripts inline e handlers injetados precisam ser bloqueados. A validação local usa mocks de rede e não mede impressão física ou contabilização de anúncios. O smoke público verifica separadamente as dependências Google reais, sem login ou sensores.

Na validação pública final de 26/11/2026, home, `/login` e `/backoffice/login` retornaram 200, com Google real, Service Worker normal e sem overrides: zero violações CSP, erros de console ou falhas de rede. A origem exata de script `https://googleads.g.doubleclick.net` foi necessária ao Google Ads existente e foi autorizada após observação no navegador. A auditoria HTTP dos 23 apontamentos e dos três caminhos de API passou. Também passaram lint, tipos, build, Storybook, 196 testes unitários do frontend e 51 testes de implantação/backend, incluindo 13 com Nginx 1.24 real.

## Reexecução RouteSentinel

A execução **36** foi iniciada após o deploy no mesmo alvo 23 e perfil 7 da execução 35, preservando limites, concorrência e timeout. Ela terminou **Failed**, com `WORKER_STOPPED`, quando o Worker local foi encerrado. Existem 214 respostas HTTP confirmadas; outros 409 resultados foram reconciliados como inconclusivos sem resultado confirmado. O contador 623/623 desse relatório descreve cobertura contabilizada, não 623 respostas HTTP observadas. A API recusou a exportação PDF dessa execução interrompida com 409; nenhum PDF de sucesso foi produzido ou status alterado.

O histórico interrompido permanece preservado. A execução substituta **37** usou um Worker temporário independente do Visual Studio, mantendo organização 2, alvo 23 e perfil 7. Ela terminou **Completed** em **26/11/2026 às 22:44:04 UTC (19:44:04 em Brasília)**, com **623 respostas HTTP reais**, nenhuma reconciliação sem resultado confirmado e nenhuma correspondência ausente no comparativo: 390 respostas 200, 232 respostas 404 e uma resposta 301. O controle de caminho ausente continua excluído do resumo de 622 resultados.

| Classificação no resumo | Execução 35 | Execução 37 |
| ---------------------- | ----------: | ----------: |
| Exposição confirmada   |           0 |           0 |
| Requer análise         |          23 |           0 |
| Conforme               |         596 |         597 |
| Inconclusivo           |           3 |          25 |

Os 596 resultados anteriormente conformes permaneceram conformes. O arquivo canônico `security.txt` passou de “Requer análise” para “Conforme”. Dos 25 inconclusivos, 21 são os antigos falsos 200 agora respondidos corretamente com 404, três são os caminhos de API consultados no host do frontend e um é o redirecionamento 301 de `/security.txt`. Esses 25 resultados foram revisados, mas não foram reclassificados como conformes. A auditoria HTTP independente confirmou os cabeçalhos nos 404 e no redirecionamento, o arquivo canônico e os endpoints no host correto.

O PDF oficial da execução 37 foi exportado pela API após a conclusão, com 39 páginas. Foram conferidas visualmente as páginas 2, 3 e 39, sem cortes ou sobreposições observados. SHA-256: `ae3bb02d9f554dd9622c20cacc5564eaf471a8c7f5163ee26d58e57fb6334b2b`.

Os cinco processos temporários da validação foram encerrados após conferir filas ociosas, identidade dos processos e ausência de dependência de API do usuário. A limpeza terminou às 22:48:18 UTC, sem listeners temporários restantes. O histórico das execuções foi preservado.

Durante uma consulta manual, `SentinelException: Execução não encontrada` correspondeu ao HTTP 404 `scan.not_found` no escopo de organização resolvido. Os relatórios 35 e 37 pertencem à organização 2 e foram obtidos nesse escopo. O debugger pode interromper no lançamento da exceção antes do handler HTTP; isso não exige remover o filtro de organização nem alterar permissões de acesso.

Artefatos operacionais ficam em `artifacts/security-035/` (ignorados pelo Git): JSON anterior/posterior, logs de publicação, baseline autenticado, comparação completa das 623 verificações em JSON/CSV e PDF oficial em `routesentinel/Relatorio_RouteSentinel_careauto.online_execucao-37.pdf`. A auditoria pública final de 26/11/2026 às 22:44:38 UTC passou. Os arquivos locais alterados ainda precisam ser versionados para que a próxima publicação pelo GitHub mantenha esta configuração.

## Referências

- [Configuração do Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration).
- [RFC 9116 — security.txt](https://www.rfc-editor.org/rfc/rfc9116.html).
- [CSP do Google Tag](https://developers.google.com/tag-platform/security/guides/csp).
- [CSP e estilos MUI](https://mui.com/material-ui/guides/content-security-policy/).

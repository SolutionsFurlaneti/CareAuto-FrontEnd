# CareAuto para Android e iPhone

O workflow reutilizável `.github/workflows/mobile.yml` é chamado pelo `cd.yml` depois que CI e deploy terminam com sucesso (ou quando o deploy de produção está desativado). Ele compila os pacotes e publica somente na pasta `AutoCareManager` dos repositórios de distribuição. Para publicar manualmente, execute `CD` na branch `main`, mantendo a sequência crescente do `versionCode`. Pull requests validam os builds, sem assinar nem publicar.

## Android

O Capacitor fica em `frontend/android`, usa o pacote `br.com.furlaneti.autocare` e exige Android 7 (API 24) ou superior. O frontend é embarcado no APK; a API continua remota em `https://www.furlaneti.com.br/autocare-api`.

Distribuição: [AndroidPackageKit/AutoCareManager](https://github.com/SolutionsFurlaneti/AndroidPackageKit/tree/main/AutoCareManager).

O arquivo publicado é `AutoCareManager.apk`, disponível em [download direto](https://raw.githubusercontent.com/SolutionsFurlaneti/AndroidPackageKit/main/AutoCareManager/AutoCareManager.apk). `latest.json` contém versão, commit de origem e SHA-256. O APK de release usa sempre o mesmo keystore para permitir atualização por cima de instalações existentes.

## iPhone e iPad

A distribuição iOS é um **PWA instalado pelo Safari**, sem App Store e sem arquivo IPA. Acesse [CareAuto](https://autocare.online) no Safari, toque em Compartilhar → Adicionar à Tela de Início e confirme. O manifesto e o ícone Apple habilitam a instalação em modo de app.

Distribuição: [iPhoneOperatingSystem/AutoCareManager](https://github.com/SolutionsFurlaneti/iPhoneOperatingSystem/tree/main/AutoCareManager). A pasta recebe `AutoCareManager-iOS.zip` para distribuição e auditoria; esse ZIP não é instalador. O service worker mostra uma mensagem genérica sem conexão e não armazena páginas autenticadas, tokens, dados operacionais nem respostas da API.

## Secrets do GitHub Actions

Configure em `SolutionsFurlaneti/AutoCareManager` → **Settings → Secrets and variables → Actions → New repository secret**. Os cinco valores devem ser cadastrados como **secrets** do repositório:

| Secret                      | Conteúdo                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | Keystore Android codificado em base64                                                                    |
| `ANDROID_KEYSTORE_PASSWORD` | Senha do keystore                                                                                        |
| `ANDROID_KEY_ALIAS`         | Alias da chave de assinatura                                                                             |
| `ANDROID_KEY_PASSWORD`      | Senha da chave                                                                                           |
| `MOBILE_DISTRIBUTION_TOKEN` | Token fine-grained com Contents: Read and write somente em `AndroidPackageKit` e `iPhoneOperatingSystem` |

Os builds de pull request não precisam desses secrets. A publicação na branch `main` exige os quatro secrets Android para assinar o APK e `MOBILE_DISTRIBUTION_TOKEN` para gravar os pacotes nos dois repositórios. O workflow agora deixa os builds começarem sem secrets e indica no step de publicação exatamente qual secret está faltando.

O keystore de release é permanente: trocá-lo impede atualizar instalações anteriores. Guarde uma cópia segura e nunca o inclua no repositório. O token precisa estar aprovado pela organização e ser renovado antes do vencimento. PRs não usam esses secrets.

## Build local

Requisitos Android: Node 22, Java 21, Android SDK 36 e build-tools 36.0.0.

```sh
python3 -m unittest discover -s mobile -p 'test*.py' -v
cd frontend
npm ci
npm run android:sync
node scripts/build-apk.mjs
```

O comando local acima gera um APK de debug. Para compilar release assinado, configure `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ANDROID_VERSION_CODE` e `ANDROID_VERSION_NAME`, e execute `node scripts/build-apk.mjs --release`.

Para conferir o build PWA usado no pacote iOS:

```sh
cd frontend
VITE_BASE_PATH=/autocare/ VITE_API_BASE_URL=/autocare-api npm run build
```

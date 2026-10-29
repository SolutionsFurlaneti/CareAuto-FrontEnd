# Build Android do CareAuto

O projeto Capacitor versionado fica em `frontend/android`. O pacote Android é `br.com.furlaneti.autocare`, usa Android 7 (API 24) ou superior e embarca o frontend com acesso HTTPS à API `https://www.furlaneti.com.br/autocare-api`.

O workflow `.github/workflows/mobile.yml` compila, assina e publica `AutoCareManager.apk` em [AndroidPackageKit/AutoCareManager](https://github.com/SolutionsFurlaneti/AndroidPackageKit/tree/main/AutoCareManager). Os requisitos de CI, secrets de assinatura e distribuição estão em [`../mobile/README.md`](../mobile/README.md).

## Build local de debug

Requisitos: Node 22, Java 21, Android SDK 36 e build-tools 36.0.0.

```sh
npm ci
npm run android:sync
node scripts/build-apk.mjs
```

O APK de debug fica em `android/app/build/outputs/apk/debug/app-debug.apk`. Para release assinado, configure `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ANDROID_VERSION_CODE` e `ANDROID_VERSION_NAME`, e execute `node scripts/build-apk.mjs --release`.
## Impressão térmica em POS SUNMI

O APK inclui com.sunmi:printerlibrary:1.0.15 e um serviço Android em primeiro plano que consulta a fila da API. Esta etapa cobre a impressora integrada SUNMI dos modelos V2, V2s, V2s Plus e P2/P2 Smart quando o firmware fornece o serviço woyou.aidlservice.jiuiv5. O manifesto declara a visibilidade exigida para V2s e V2s Plus. O serviço reporta a conclusão com o callback de impressão do fabricante.

No terminal, entre em **Configurações > Impressão** com uma conta Admin e use **Ativar agente neste POS**. A tela mostra o ID permanente do terminal; copie esse ID e cadastre uma impressora do tipo **POS Android integrado** com esse endereço na configuração do estabelecimento. Depois envie uma impressão de teste e confira o estado em **Últimas impressões**. O token é armazenado cifrado pelo Android Keystore. Gerar um token novo invalida o token dos outros agentes do estabelecimento.

A reserva da fila e a confirmação de resultado incluem o ID do POS, para que um agente Windows ou outro POS não retire nem confirme o trabalho deste terminal. O adaptador físico SUNMI é o único habilitado nesta etapa. PAX, Gertec e os demais fabricantes dependem dos pacotes oficiais e das permissões de distribuição correspondentes; não são considerados suportados até a integração e validação de seus SDKs.

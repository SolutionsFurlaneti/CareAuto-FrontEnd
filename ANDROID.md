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


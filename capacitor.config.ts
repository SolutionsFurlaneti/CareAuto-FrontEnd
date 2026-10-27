import type { CapacitorConfig } from '@capacitor/cli';

/**
 * App Android do CareAuto (celular e Smart POS). O frontend vai embarcado no APK
 * (dist-android) e a API continua remota, em HTTPS. CapacitorHttp envia as chamadas
 * pelo transporte nativo, então o app não depende de CORS no servidor.
 */
const config: CapacitorConfig = {
  appId: 'br.com.furlaneti.autocare',
  appName: 'CareAuto',
  webDir: 'dist-android',
  server: { androidScheme: 'https', cleartext: false },
  android: { allowMixedContent: false },
  plugins: { CapacitorHttp: { enabled: true } },
};
export default config;


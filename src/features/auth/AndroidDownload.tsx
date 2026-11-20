import { useEffect } from 'react';
import { Download } from 'lucide-react';
import { ANDROID_APK_URL, isAndroidDevice, isNativeApp } from '../../lib/device';
import { useI18n } from '../../i18n';

const autoDownloadKey = `autocare-apk-auto-download:${ANDROID_APK_URL}`;
function markAutomaticDownloadAttempt() {
  try {
    if (window.sessionStorage.getItem(autoDownloadKey)) return false;
    window.sessionStorage.setItem(autoDownloadKey, '1');
  } catch {
    // Continue with one attempt if browser storage is unavailable.
  }
  return true;
}

/**
 * Download direto do APK (link raw, sem passar pela interface do GitHub).
 * Fica oculto dentro do próprio app Android.
 */
export function AndroidDownload() {
  const { t } = useI18n();
  const nativeApp = isNativeApp();
  const android = isAndroidDevice();

  useEffect(() => {
    if (nativeApp || !android) return;
    // Browsers may block a download without a tap. Keep the visible link as a fallback.
    const timer = window.setTimeout(() => {
      const link = document.querySelector<HTMLAnchorElement>('[data-testid="apk-download"]');
      if (link && markAutomaticDownloadAttempt()) link.click();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [android, nativeApp]);

  if (nativeApp) return null;
  return (
    <a
      className="apk-download"
      href={ANDROID_APK_URL}
      download="AutoCareManager.apk"
      rel="noopener"
      data-testid="apk-download"
    >
      <Download size={20} aria-hidden="true" />
      <span>
        <strong>{t('Baixar para Android')}</strong>
        <small>
          {t(
            android
              ? 'Se o download não iniciar automaticamente, toque aqui. O Android pedirá confirmação para instalar.'
              : 'APK para celular e maquininha (Smart POS)',
          )}
        </small>
      </span>
    </a>
  );
}

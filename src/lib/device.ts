import { Capacitor } from '@capacitor/core';

/** True dentro do APK (WebView do Capacitor); false no navegador. */
export const isNativeApp = () => Capacitor.isNativePlatform();

/** Detecta o navegador Android para orientar e iniciar o download do APK. */
export const isAndroidDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const userAgentData = navigator as Navigator & { userAgentData?: { platform?: string } };
  return userAgentData.userAgentData?.platform === 'Android' || /Android/i.test(navigator.userAgent);
};

/** Link direto (raw) do APK publicado; sobrescreva com VITE_ANDROID_APK_URL. */
export const ANDROID_APK_URL =
  import.meta.env.VITE_ANDROID_APK_URL ||
  'https://raw.githubusercontent.com/SolutionsFurlaneti/AndroidPackageKit/main/AutoCareManager/AutoCareManager.apk';

/** Registra o PWA no navegador; o shell nativo Android usa o build embarcado. */
export function registerPwaServiceWorker(): void {
  if (isNativeApp() || !import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((error: unknown) => console.warn('Não foi possível registrar o PWA.', error));
  });
}

const editable = (el: Element | null): el is HTMLElement =>
  el instanceof HTMLElement &&
  (el.matches('input:not([type=checkbox]):not([type=radio]), select, textarea') ||
    el.isContentEditable);

/**
 * Em celulares e maquininhas o teclado virtual reduz a área visível. Quando isso
 * acontece com um campo em foco, rola até ele e até o botão principal do formulário,
 * para que "Entrar"/"Salvar" não fiquem escondidos atrás do teclado.
 */
export function keepFocusedFieldVisible(win: Window = window): () => void {
  const visual = win.visualViewport;
  if (!visual) return () => {};
  let last = visual.height;
  const reveal = () => {
    const shrank = visual.height < last - 80;
    last = visual.height;
    const el = win.document.activeElement;
    if (!shrank || !editable(el)) return;
    const submit = el.closest('form')?.querySelector<HTMLElement>('[type=submit]');
    // Mostra o botão se couber junto com o campo; senão, prioriza o campo.
    const target =
      submit &&
      submit.getBoundingClientRect().bottom - el.getBoundingClientRect().top < visual.height - 24
        ? submit
        : el;
    target.scrollIntoView({ block: target === el ? 'center' : 'end', behavior: 'auto' });
    if (target !== el) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  };
  visual.addEventListener('resize', reveal);
  return () => visual.removeEventListener('resize', reveal);
}

/** Botão Voltar do Android: volta no histórico do app; na primeira tela, minimiza. */
export async function bindNativeBackButton() {
  if (!isNativeApp()) return;
  const { App } = await import('@capacitor/app');
  await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void App.minimizeApp();
  });
}

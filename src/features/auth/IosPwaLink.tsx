import { Apple } from 'lucide-react';
import { isAndroidDevice } from '../../lib/device';
import { appPath } from '../../lib/basePath';
import { useI18n } from '../../i18n';

/** iOS uses the website as an installable PWA; installation is completed in Safari. */
export function IosPwaLink() {
  const { t } = useI18n();
  if (isAndroidDevice()) return null;
  return (
    <a className="ios-pwa-link" href={appPath('/visao-geral')} data-testid="ios-pwa-link">
      <Apple size={20} aria-hidden="true" />
      <span>
        <strong>{t('Acessar no iPhone')}</strong>
        <small>{t('No Safari: Compartilhar → Adicionar à Tela de Início')}</small>
      </span>
    </a>
  );
}

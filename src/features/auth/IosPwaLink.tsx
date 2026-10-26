import { Apple } from 'lucide-react';
import { isAndroidDevice } from '../../lib/device';

/** iOS uses the website as an installable PWA; installation is completed in Safari. */
export function IosPwaLink() {
  if (isAndroidDevice()) return null;
  return (
    <a className="ios-pwa-link" href={import.meta.env.BASE_URL} data-testid="ios-pwa-link">
      <Apple size={20} aria-hidden="true" />
      <span>
        <strong>Acessar no iPhone</strong>
        <small>No Safari: Compartilhar → Adicionar à Tela de Início</small>
      </span>
    </a>
  );
}

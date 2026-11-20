import { MapPin } from 'lucide-react';
import { Button } from '../../ui';
import type { LocationConsentStatus } from './locationConsent';
import { useI18n } from '../../i18n';
import './locationConsent.css';

type Props = {
  status: LocationConsentStatus;
  message: string;
  onRequest: () => void;
  onDismiss: () => void;
  onStop: () => void;
};

export function LocationConsentPrompt({ status, message, onRequest, onDismiss, onStop }: Props) {
  const { t } = useI18n();
  if (status === 'unavailable') return null;
  if (status === 'dismissed' || status === 'granted' || status === 'expired')
    return (
      <div className="location-consent-choice" data-testid="location-consent-choice">
        <MapPin size={15} aria-hidden="true" />
        <Button
          variant="ghost"
          data-testid={status === 'granted' ? 'location-consent-stop' : 'location-consent-open'}
          onClick={status === 'granted' ? onStop : onRequest}
        >
          {t(
            status === 'granted'
              ? 'Parar de compartilhar localização'
              : status === 'expired'
                ? 'Atualizar localização'
                : 'Compartilhar localização',
          )}
        </Button>
      </div>
    );
  return (
    <aside
      className="location-consent"
      role="region"
      aria-labelledby="location-consent-title"
      data-testid="location-consent"
    >
      <div className="location-consent-copy">
        <MapPin size={21} aria-hidden="true" />
        <div>
          <h2 id="location-consent-title">{t('Compartilhar sua localização?')}</h2>
          <p>
            {t(
              'Com sua autorização, o CareAuto registra suas coordenadas e consulta um serviço de localização para identificar a região e o endereço aproximado nas estatísticas de acessos. Você pode continuar usando o aplicativo sem compartilhar.',
            )}
          </p>
          {message && (
            <p
              className="location-consent-message"
              role="status"
              data-testid="location-consent-message"
            >
              {t(message)}
            </p>
          )}
          {status === 'requesting' && (
            <p role="status" className="location-consent-message">
              {t('Aguardando a localização do navegador…')}
            </p>
          )}
        </div>
      </div>
      <div className="location-consent-actions">
        {status !== 'denied' && (
          <Button
            busy={status === 'requesting'}
            onClick={onRequest}
            data-testid="location-consent-allow"
          >
            {t(status === 'error' ? 'Tentar novamente' : 'Permitir localização')}
          </Button>
        )}
        <Button variant="ghost" onClick={onDismiss} data-testid="location-consent-decline">
          {t(status === 'denied' || status === 'error' ? 'Continuar sem localização' : 'Agora não')}
        </Button>
      </div>
    </aside>
  );
}

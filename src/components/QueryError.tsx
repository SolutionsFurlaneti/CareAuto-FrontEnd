import { AlertCircle } from 'lucide-react';
import { describeError } from '../lib/describeError';
import { Button } from '../ui';
import { useI18n } from '../i18n';
export function QueryError({
  error,
  what,
  onRetry,
}: {
  error: unknown;
  what: string;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="query-error" role="alert" data-testid="query-error">
      <AlertCircle />
      <div>
        <strong>{t('Não foi possível carregar {what}', { what: t(what) })}</strong>
        <p>{describeError(error)}</p>
      </div>
      <Button variant="secondary" data-testid="query-retry" onClick={onRetry}>
        {t('Tentar novamente')}
      </Button>
    </div>
  );
}

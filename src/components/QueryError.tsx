import { AlertCircle } from 'lucide-react';
import { describeError } from '../lib/describeError';
import { Button } from '../ui';
export function QueryError({
  error,
  what,
  onRetry,
}: {
  error: unknown;
  what: string;
  onRetry: () => void;
}) {
  return (
    <div className="query-error" role="alert" data-testid="query-error">
      <AlertCircle />
      <div>
        <strong>Não foi possível carregar {what}</strong>
        <p>{describeError(error)}</p>
      </div>
      <Button variant="secondary" data-testid="query-retry" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
export function EmptyState({
  title = 'Tudo pronto para começar',
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="empty-state" data-testid="empty-state">
      <span className="empty-icon">
        <Inbox size={26} />
      </span>
      <h3>{t(title)}</h3>
      <p>{t(description)}</p>
      {action}
    </div>
  );
}

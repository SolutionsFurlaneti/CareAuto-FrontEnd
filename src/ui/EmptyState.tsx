import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
export function EmptyState({
  title = 'Tudo pronto para começar',
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state" data-testid="empty-state">
      <span className="empty-icon">
        <Inbox size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

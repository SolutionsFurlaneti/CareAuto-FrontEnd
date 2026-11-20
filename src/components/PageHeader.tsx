import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{t(eyebrow)}</p>
        <h1 data-testid="page-title">{t(title)}</h1>
        <p className="page-description">{t(description)}</p>
      </div>
      {action && <div className="page-actions">{action}</div>}
    </header>
  );
}

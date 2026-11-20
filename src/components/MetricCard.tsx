import { Card } from '@mui/material';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
export function MetricCard({
  label,
  value,
  note,
  icon,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Card className={'metric-card' + (accent ? ' metric-accent' : '')} elevation={0}>
      <div className="metric-label">
        <span>{t(label)}</span>
        {icon}
      </div>
      <strong data-testid={'metric-' + label}>{value}</strong>
      <span className="metric-note">{t(note)}</span>
    </Card>
  );
}

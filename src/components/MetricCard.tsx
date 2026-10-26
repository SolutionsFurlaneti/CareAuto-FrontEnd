import { Card } from '@mui/material';
import type { ReactNode } from 'react';
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
  return (
    <Card className={'metric-card' + (accent ? ' metric-accent' : '')} elevation={0}>
      <div className="metric-label">
        <span>{label}</span>
        {icon}
      </div>
      <strong data-testid={'metric-' + label}>{value}</strong>
      <span className="metric-note">{note}</span>
    </Card>
  );
}

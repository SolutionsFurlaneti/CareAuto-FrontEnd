import { useI18n } from '../i18n';
export function StatusBadge({ status, label }: { status: string; label: string }) {
  const { t } = useI18n();
  return (
    <span
      className={'status-badge status-' + status.toLowerCase()}
      data-testid={'status-' + status}
    >
      <span aria-hidden="true" />
      {t(label)}
    </span>
  );
}

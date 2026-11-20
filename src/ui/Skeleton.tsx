import { useI18n } from '../i18n';
export function Skeleton() {
  const { t } = useI18n();
  return (
    <div
      className="skeletons"
      role="status"
      aria-label={t('Carregando dados')}
      data-testid="loading"
    >
      <span />
      <span />
      <span />
    </div>
  );
}

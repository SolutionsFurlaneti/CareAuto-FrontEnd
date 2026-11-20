import { useAllRecords } from '../features/shared/hooks';
import type { Entity } from '../lib/types';
import { useI18n } from '../i18n';
export function ReferenceLabel({
  id,
  resource,
  idField,
  labelField,
}: {
  id: number | null;
  resource: string;
  idField: string;
  labelField: string;
}) {
  const { t } = useI18n();
  const query = useAllRecords<Entity>(resource, id !== null);
  if (id === null) return <span className="muted">{t('Avulso')}</span>;
  const item = query.data?.find((x) => x[idField] === id);
  return <span>{item ? String(item[labelField]) : '#' + id}</span>;
}

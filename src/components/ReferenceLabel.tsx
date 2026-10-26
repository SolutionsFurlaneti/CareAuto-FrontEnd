import { useAllRecords } from '../features/shared/hooks';
import type { Entity } from '../lib/types';
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
  const query = useAllRecords<Entity>(resource, id !== null);
  if (id === null) return <span className="muted">Avulso</span>;
  const item = query.data?.find((x) => x[idField] === id);
  return <span>{item ? String(item[labelField]) : '#' + id}</span>;
}

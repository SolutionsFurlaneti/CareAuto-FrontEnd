import { useState } from 'react';
import { Plus, Pencil, Archive, Search } from 'lucide-react';
import type { Entity } from '../lib/types';
import { useAuthStore, hasRole, type Role } from '../stores/authStore';
import { useRecords, useSaveRecord, useDeactivate } from '../features/shared/hooks';
import { Button, EmptyState, Field, Modal, Skeleton } from '../ui';
import { DataTable, type Column } from './DataTable';
import { PageHeader } from './PageHeader';
import { Pagination } from './Pagination';
import { QueryError } from './QueryError';
import { RecordForm, type FormSpec } from './RecordForm';
import { confirmAction } from '../lib/swal';
import type { FormValues } from '../features/shared/schema';
export interface ResourceSpec<T extends Entity> {
  endpoint: string;
  id: keyof T & string;
  title: string;
  eyebrow: string;
  description: string;
  singular: string;
  columns: Column<T>[];
  form: FormSpec;
  writeRoles: Role[];
  softDelete?: boolean;
}
export function ResourcePage<T extends Entity>({ spec }: { spec: ResourceSpec<T> }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const roles = useAuthStore((s) => s.session?.roles || []);
  const writable = hasRole(roles, spec.writeRoles);
  const query = useRecords<T>(spec.endpoint, page);
  const save = useSaveRecord<T>(spec.endpoint);
  const deactivate = useDeactivate(spec.endpoint);
  const rows =
    query.data?.items.filter((x) =>
      Object.values(x).some((v) =>
        String(v ?? '')
          .toLocaleLowerCase('pt-BR')
          .includes(filter.toLocaleLowerCase('pt-BR')),
      ),
    ) || [];
  const initial =
    editing && editing !== 'new'
      ? (Object.fromEntries(
          Object.keys(spec.form.defaults).map((k) => [k, editing[k]]),
        ) as FormValues)
      : undefined;
  const open = (row: T | 'new') => {
    save.reset();
    setEditing(row);
  };
  const columns: Column<T>[] = [
    ...spec.columns,
    ...(writable
      ? [
          {
            label: 'Ações',
            render: (row: T) => (
              <div className="row-actions">
                <Button
                  variant="ghost"
                  aria-label={'Editar ' + spec.singular}
                  data-testid="record-edit"
                  onClick={() => open(row)}
                >
                  <Pencil size={16} />
                </Button>
                {spec.softDelete && row.ativo === true && (
                  <Button
                    variant="ghost"
                    aria-label={'Desativar ' + spec.singular}
                    data-testid="record-deactivate"
                    disabled={deactivate.isPending}
                    onClick={async () => {
                      if (
                        await confirmAction(
                          'Desativar ' + spec.singular + '?',
                          'O histórico será preservado e o registro deixará de aceitar novas operações.',
                          'Desativar',
                        )
                      )
                        deactivate.mutate(Number(row[spec.id]));
                    }}
                  >
                    <Archive size={16} />
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];
  return (
    <>
      <PageHeader
        eyebrow={spec.eyebrow}
        title={spec.title}
        description={spec.description}
        action={
          writable && (
            <Button data-testid="record-new" onClick={() => open('new')}>
              <Plus size={18} />
              Adicionar {spec.singular}
            </Button>
          )
        }
      />
      <section className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>{spec.title}</h2>
            <span>{query.data?.total ?? '—'} registros</span>
          </div>
          <div className="search-field">
            <Search size={17} />
            <Field
              label="Filtrar nesta página"
              data-testid="record-search"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar nesta página"
            />
          </div>
        </div>
        {query.isPending ? (
          <Skeleton />
        ) : query.isError ? (
          <QueryError
            error={query.error}
            what={spec.title.toLowerCase()}
            onRetry={() => void query.refetch()}
          />
        ) : rows.length ? (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(row) => String(row[spec.id])}
            testId={spec.endpoint + '-table'}
            caption={spec.title}
          />
        ) : (
          <EmptyState
            title={filter ? 'Nenhum resultado nesta página' : 'Nenhum registro por aqui'}
            description={
              filter
                ? 'Tente outro termo ou consulte as outras páginas.'
                : 'Adicione o primeiro registro para começar.'
            }
          />
        )}
        {query.data && (
          <Pagination
            page={page}
            size={20}
            total={query.data.total}
            busy={query.isFetching}
            onChange={(p) => {
              setPage(p);
              setFilter('');
            }}
          />
        )}
      </section>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        busy={save.isPending}
        title={(editing === 'new' ? 'Adicionar ' : 'Editar ') + spec.singular}
        actions={
          <>
            <Button
              variant="secondary"
              data-testid="form-cancel"
              disabled={save.isPending}
              onClick={() => setEditing(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="record-form"
              data-testid="form-submit"
              busy={save.isPending}
            >
              Salvar {spec.singular}
            </Button>
          </>
        }
      >
        {editing !== null && (
          <RecordForm
            key={editing === 'new' ? 'new' : String(editing[spec.id])}
            formId="record-form"
            spec={spec.form}
            initial={initial}
            error={save.error}
            onSubmit={async (values) => {
              try {
                await save.mutateAsync({
                  data: values,
                  id: editing === 'new' ? undefined : Number(editing[spec.id]),
                });
                setEditing(null);
              } catch {
                /* Mutation error remains inside the form. */
              }
            }}
          />
        )}
      </Modal>
    </>
  );
}

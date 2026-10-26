import { useState, useEffect } from 'react';
import { Plus, CarFront, Clock3, ArrowUpRight, Search, Timer, LayoutGrid, List } from 'lucide-react';
import { Button, Field, Skeleton, EmptyState, StatusBadge } from '../../ui';
import { PageHeader } from '../../components/PageHeader';
import { MetricCard } from '../../components/MetricCard';
import { QueryError } from '../../components/QueryError';
import { DataTable } from '../../components/DataTable';
import { Pagination } from '../../components/Pagination';
import { useAllRecords } from '../shared/hooks';
import type { Estadia, Veiculo } from '../../lib/types';
import { dateTime, money } from '../../lib/format';
import { label } from '../../lib/labels';
import { EntryModal } from './EntryModal';
import { StayDetails } from './StayDetails';

const calcDuration = (entrada: string, saida?: string | null) => {
  const start = new Date(entrada).getTime();
  const end = saida ? new Date(saida).getTime() : Date.now();
  const diffMinutes = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
};

const getDurationTier = (entrada: string, saida?: string | null): 'tolerancia' | 'regular' | 'alerta' => {
  if (saida) return 'regular';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(entrada).getTime()) / 60000));
  if (diffMinutes <= 15) return 'tolerancia';
  if (diffMinutes > 240) return 'alerta';
  return 'regular';
};

export function StaysPage() {
  const query = useAllRecords<Estadia>('estadias');
  const vehicles = useAllRecords<Veiculo>('veiculos');
  const [status, setStatus] = useState('EM_ANDAMENTO');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [entry, setEntry] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setEntry(true);
      }
      if (e.key === 'F3') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('[data-testid="stay-search"] input');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getVehicle = (id: number) => vehicles.data?.find((x) => x.veiculoId === id);
  const plate = (id: number) => getVehicle(id)?.placa || '#' + id;

  const all = query.data || [];
  const openCount = all.filter((x) => x.status === 'EM_ANDAMENTO').length;
  const closedCount = all.filter((x) => x.status === 'CONCLUIDO').length;

  const rows = all
    .filter(
      (x) =>
        (!status || x.status === status) &&
        plate(x.veiculoId).toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.estadiaId - a.estadiaId);

  return (
    <>
      <PageHeader
        eyebrow="OPERAÇÃO EM TEMPO REAL"
        title="Estacionamento"
        description="Controle de pátio ao vivo: entradas, serviços em execução e checkout ágil."
        action={
          <Button
            data-testid="stay-new"
            onClick={() => setEntry(true)}
            style={{ fontWeight: 650, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          >
            <Plus size={18} />
            Registrar entrada
          </Button>
        }
      />
      <div className="metrics metrics-three">
        <MetricCard
          label="No pátio agora"
          value={query.data ? String(openCount) : '—'}
          note="Veículos em permanência"
          icon={<CarFront size={20} />}
          accent
        />
        <MetricCard
          label="Saídas hoje"
          value={query.data ? String(closedCount) : '—'}
          note="Atendimentos concluídos"
          icon={<ArrowUpRight size={20} />}
        />
        <MetricCard
          label="Total no histórico"
          value={query.data ? String(all.length) : '—'}
          note="Todas as estadias registradas"
          icon={<Clock3 size={20} />}
        />
      </div>

      <section className="panel">
        <div className="panel-toolbar">
          <div className="tabs" aria-label="Filtrar estadias">
            {[
              ['EM_ANDAMENTO', `Em andamento (${openCount})`],
              ['CONCLUIDO', `Concluídas (${closedCount})`],
              ['', `Todas (${all.length})`],
            ].map(([value, text]) => (
              <button
                key={value}
                className={status === value ? 'tab active' : 'tab'}
                aria-pressed={status === value}
                data-testid={'stays-filter-' + (value || 'all')}
                onClick={() => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                {text}
              </button>
            ))}
          </div>
          <div className="search-field">
            <Search size={17} />
            <Field
              label="Buscar placa"
              data-testid="stay-search"
              placeholder="Buscar por placa ou ID (F3)…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="tabs" style={{ marginLeft: 'auto' }} aria-label="Modo de visualização">
            <button
              type="button"
              className={viewMode === 'table' ? 'tab active' : 'tab'}
              onClick={() => setViewMode('table')}
              title="Exibir como Tabela"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <List size={15} />
              <span>Tabela</span>
            </button>
            <button
              type="button"
              className={viewMode === 'cards' ? 'tab active' : 'tab'}
              onClick={() => setViewMode('cards')}
              title="Exibir como Vagas do Pátio"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <LayoutGrid size={15} />
              <span>Vagas</span>
            </button>
          </div>
        </div>

        {query.isPending || vehicles.isPending ? (
          <Skeleton />
        ) : query.isError || vehicles.isError ? (
          <QueryError
            error={query.error || vehicles.error}
            what="as estadias"
            onRetry={() => {
              void query.refetch();
              void vehicles.refetch();
            }}
          />
        ) : rows.length ? (
          viewMode === 'cards' ? (
            <div className="patio-grid" style={{ padding: '0 16px' }}>
              {rows.slice((page - 1) * 20, page * 20).map((r) => {
                const v = getVehicle(r.veiculoId);
                const tier = getDurationTier(r.dataEntrada, r.dataSaida);
                return (
                  <div key={r.estadiaId} className={`patio-card status-${tier}`}>
                    <div className="patio-card-header">
                      <span className="plate">{v?.placa || '#' + r.veiculoId}</span>
                      <span className={`patio-time-badge ${tier}`}>
                        <Timer size={13} />
                        {calcDuration(r.dataEntrada, r.dataSaida)}
                      </span>
                    </div>
                    <div className="patio-card-body">
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                        {v ? `${v.marca || ''} ${v.modelo || ''}`.trim() : `Estadia #${r.estadiaId}`}
                      </div>
                      <small style={{ color: 'var(--ink-dim)', fontSize: '12px' }}>
                        {v?.cor ? `Cor: ${v.cor} · ` : ''}Entrada: {dateTime(r.dataEntrada)}
                      </small>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <StatusBadge status={r.status} label={label(r.status)} />
                      </div>
                    </div>
                    <div className="patio-card-footer">
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--ink-faint)', display: 'block' }}>Total</span>
                        <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>{money(r.valorTotal)}</strong>
                      </div>
                      <Button
                        variant="ghost"
                        data-testid="stay-details"
                        onClick={() => setSelected(r.estadiaId)}
                        style={{ fontWeight: 600 }}
                      >
                        Ver estadia <ArrowUpRight size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <DataTable
              rows={rows.slice((page - 1) * 20, page * 20)}
              rowKey={(r) => r.estadiaId}
              testId="stays-table"
              caption="Estadias"
              columns={[
                {
                  label: 'Veículo',
                  render: (r) => {
                    const v = getVehicle(r.veiculoId);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span className="plate">{v?.placa || '#' + r.veiculoId}</span>
                        <small style={{ color: 'var(--ink-dim)', fontSize: '11px' }}>
                          {v ? `${v.marca || ''} ${v.modelo || ''} · ${v.cor || ''}`.trim() : `Estadia #${r.estadiaId}`}
                        </small>
                      </div>
                    );
                  },
                },
                {
                  label: 'Tempo de Pátio',
                  render: (r) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Timer size={14} style={{ color: r.status === 'EM_ANDAMENTO' ? 'var(--ok)' : 'var(--ink-faint)' }} />
                      <span style={{ fontWeight: 650, color: r.status === 'EM_ANDAMENTO' ? 'var(--ok)' : 'var(--ink-dim)' }}>
                        {calcDuration(r.dataEntrada, r.dataSaida)}
                      </span>
                    </div>
                  ),
                },
                { label: 'Entrada', render: (r) => dateTime(r.dataEntrada) },
                {
                  label: 'Situação',
                  render: (r) => <StatusBadge status={r.status} label={label(r.status)} />,
                },
                { label: 'Total', render: (r) => money(r.valorTotal) },
                {
                  label: 'Detalhes',
                  render: (r) => (
                    <Button
                      variant="ghost"
                      data-testid="stay-details"
                      onClick={() => setSelected(r.estadiaId)}
                      style={{ fontWeight: 600 }}
                    >
                      Ver estadia <ArrowUpRight size={16} />
                    </Button>
                  ),
                },
              ]}
            />
          )
        ) : (
          <EmptyState
            title={search ? 'Nenhum veículo encontrado com essa placa' : 'O pátio está livre no momento'}
            description={
              search
                ? 'Confira os caracteres digitados ou o filtro selecionado acima.'
                : 'Clique em "Registrar entrada" (ou pressione F2) acima para iniciar o primeiro atendimento.'
            }
          />
        )}
        <Pagination page={page} size={20} total={rows.length} onChange={setPage} />
      </section>

      {entry && <EntryModal onClose={() => setEntry(false)} />}
      {selected !== null && <StayDetails id={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

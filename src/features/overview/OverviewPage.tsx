import { getLocale, translate, useI18n } from '../../i18n';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CarFront,
  ArrowUpRight,
  Wallet,
  CalendarDays,
  ArrowDownToLine,
  Activity,
  Timer,
  Sparkles,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useOverview } from './hooks';
import { PageHeader } from '../../components/PageHeader';
import { MetricCard } from '../../components/MetricCard';
import { QueryError } from '../../components/QueryError';
import { DataTable } from '../../components/DataTable';
import { Skeleton, Button, EmptyState, StatusBadge } from '../../ui';
import { money, dateTime, todayIso, integer } from '../../lib/format';
import { label } from '../../lib/labels';
import { StayDetails } from '../stays/StayDetails';
import { Modal } from '../../ui/Modal';

const localDay = (value: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(/[Zz]|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z'));

const shortDay = (value: string) =>
  new Intl.DateTimeFormat(getLocale(), {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value + 'T12:00:00Z'));

const calcDuration = (entrada: string, saida?: string | null) => {
  const start = new Date(entrada).getTime();
  const end = saida ? new Date(saida).getTime() : Date.now();
  const diffMinutes = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours > 0) return `${integer(hours)}h ${integer(mins)}m`;
  return `${integer(mins)} min`;
};

export function OverviewPage() {
  useI18n();
  const q = useOverview();
  const [table, setTable] = useState(false);
  const [selectedStay, setSelectedStay] = useState<number | null>(null);

  const data = q.data;
  const today = todayIso();
  const open = data?.stays.filter((x) => x.status === 'EM_ANDAMENTO').length || 0;
  const arrivals = data?.stays.filter((x) => localDay(x.dataEntrada) === today).length || 0;
  const totalSpots = 30;
  const occupancyPercent = Math.min(100, Math.round((open / totalSpots) * 100));

  const received =
    data?.payments
      .filter((x) => x.status === 'PAGO' && x.pagoEm && localDay(x.pagoEm) === today)
      .reduce((n, x) => n + x.valorCentavos, 0) || 0;
  const pending =
    data?.payments
      .filter((x) => x.status === 'PENDENTE')
      .reduce((n, x) => n + x.valorCentavos, 0) || 0;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 6 + i);
    return d.toISOString().slice(0, 10);
  });

  const series = days.map((day) => ({
    day,
    label: shortDay(day),
    value: data?.operation
      ? data.stays.filter((x) => localDay(x.dataEntrada) === day).length
      : (data?.payments
          .filter((x) => x.status === 'PAGO' && x.pagoEm && localDay(x.pagoEm) === day)
          .reduce((n, x) => n + x.valorCentavos, 0) || 0) / 100,
  }));
  const hasChartData = series.some((x) => x.value > 0);
  const movementRows = days.map((day) => {
    const date = new Date(day + 'T12:00:00Z');
    const weekday = new Intl.DateTimeFormat(getLocale(), {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(date);
    return {
      day,
      label: shortDay(day),
      weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
      entries: data?.stays.filter((stay) => localDay(stay.dataEntrada) === day).length || 0,
      exits:
        data?.stays.filter(
          (stay) =>
            stay.status === 'CONCLUIDO' && stay.dataSaida && localDay(stay.dataSaida) === day,
        ).length || 0,
      revenue:
        data?.payments
          .filter(
            (payment) =>
              payment.status === 'PAGO' && payment.pagoEm && localDay(payment.pagoEm) === day,
          )
          .reduce((sum, payment) => sum + payment.valorCentavos, 0) || 0,
    };
  });
  const movementTotals = movementRows.reduce(
    (totals, row) => ({
      entries: totals.entries + row.entries,
      exits: totals.exits + row.exits,
      revenue: totals.revenue + row.revenue,
    }),
    { entries: 0, exits: 0, revenue: 0 },
  );

  return (
    <>
      <PageHeader
        eyebrow={translate('PAINEL OPERACIONAL')}
        title={translate('Seu dia, sob controle.')}
        description={translate(
          'Acompanhamento ao vivo de veículos no pátio, faturamento diário e serviços.',
        )}
        action={
          data?.operation && (
            <Link
              className="button button-primary"
              data-testid="overview-entry"
              to="/estacionamento"
              style={{ fontWeight: 650, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            >
              <ArrowDownToLine size={18} />
              {translate('Ir para o estacionamento')}
            </Link>
          )
        }
      />
      {q.isPending ? (
        <Skeleton />
      ) : q.isError ? (
        <QueryError error={q.error} what={translate('o painel')} onRetry={() => void q.refetch()} />
      ) : (
        data && (
          <>
            {/* Occupancy Indicator Banner */}
            {data.operation && (
              <section className="occupancy-card" aria-labelledby="occupancy-title">
                <div className="occupancy-overview">
                  <span className="occupancy-icon" aria-hidden="true">
                    <CarFront size={22} />
                  </span>
                  <div className="occupancy-copy">
                    <strong id="occupancy-title">
                      {translate(
                        'Capacidade do Pátio: {occupied} de {total} vagas ocupadas ({percent}%)',
                        {
                          occupied: integer(open),
                          total: integer(totalSpots),
                          percent: integer(occupancyPercent),
                        },
                      )}
                    </strong>
                    <span>
                      {translate(
                        '{count} vagas livres para novos clientes rotativos e mensalistas.',
                        { count: integer(totalSpots - open) },
                      )}
                    </span>
                  </div>
                </div>
                <div
                  className="occupancy-progress-track"
                  role="progressbar"
                  aria-label={translate('Ocupação do pátio')}
                  aria-valuemin={0}
                  aria-valuemax={totalSpots}
                  aria-valuenow={open}
                  aria-valuetext={translate('{occupied} de {total} vagas ocupadas ({percent}%)', {
                    occupied: integer(open),
                    total: integer(totalSpots),
                    percent: integer(occupancyPercent),
                  })}
                  data-warning={occupancyPercent > 85 ? 'true' : undefined}
                >
                  <div
                    className="occupancy-progress-value"
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
              </section>
            )}
            <div className="metrics">
              {data.operation ? (
                <>
                  <MetricCard
                    accent
                    label={translate('No estacionamento')}
                    value={integer(open)}
                    note={translate('Veículos com estadia aberta')}
                    icon={<CarFront size={20} />}
                  />
                  <MetricCard
                    label={translate('Entradas hoje')}
                    value={integer(arrivals)}
                    note={translate('Movimento do dia')}
                    icon={<ArrowDownToLine size={20} />}
                  />
                </>
              ) : (
                <>
                  <MetricCard
                    accent
                    label={translate('Assinaturas ativas')}
                    value={integer(data.subscriptions.filter((x) => x.status === 'ATIVA').length)}
                    note={translate('Vínculos de mensalistas')}
                    icon={<CalendarDays size={20} />}
                  />
                  <MetricCard
                    label={translate('Pagamentos')}
                    value={integer(data.payments.length)}
                    note={translate('Registros disponíveis para sua conta')}
                    icon={<Wallet size={20} />}
                  />
                </>
              )}
              {data.financial ? (
                <>
                  <MetricCard
                    label={translate('Recebido hoje')}
                    value={money(received / 100)}
                    note={translate('Pagamentos confirmados no dia')}
                    icon={<Wallet size={20} />}
                  />
                  <MetricCard
                    label={translate('A receber')}
                    value={money(pending / 100)}
                    note={translate('Total de pagamentos pendentes')}
                    icon={<Activity size={20} />}
                  />
                </>
              ) : (
                <>
                  <MetricCard
                    label={translate('Saídas hoje')}
                    value={integer(
                      data.stays.filter(
                        (x) =>
                          x.status === 'CONCLUIDO' &&
                          x.dataSaida &&
                          localDay(x.dataSaida) === today,
                      ).length,
                    )}
                    note={translate('Estadias concluídas no dia')}
                    icon={<ArrowUpRight size={20} />}
                  />
                  <MetricCard
                    label={translate('Veículos cadastrados')}
                    value={integer(data.vehicles.length)}
                    note={translate('Base total de clientes')}
                    icon={<CarFront size={20} />}
                  />
                </>
              )}
            </div>

            <div className="dashboard-grid">
              <section className="panel chart-panel">
                <div className="panel-toolbar">
                  <div>
                    <h2>
                      {data.operation
                        ? translate('Movimento do estacionamento')
                        : translate('Recebimentos')}
                    </h2>
                    <span>
                      {translate('Últimos 7 dias ·')}{' '}
                      {data.operation
                        ? translate('entradas por dia')
                        : translate('valores confirmados')}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    data-testid="chart-table-toggle"
                    onClick={() => setTable(true)}
                  >
                    {translate('Ver tabela')}
                  </Button>
                </div>
                {hasChartData ? (
                  <div
                    className="chart-area"
                    role="img"
                    aria-label={
                      data.operation
                        ? translate(
                            'Gráfico de entradas dos últimos 7 dias. Dados disponíveis no botão Ver tabela.',
                          )
                        : translate(
                            'Gráfico de recebimentos dos últimos 7 dias. Dados disponíveis no botão Ver tabela.',
                          )
                    }
                  >
                    <ResponsiveContainer width="100%" height={235}>
                      <BarChart data={series}>
                        <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--ink-dim)', fontSize: 12 }}
                        />
                        <YAxis
                          tickFormatter={(value: number) => integer(value)}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={!data.operation}
                          width={50}
                          tick={{ fill: 'var(--ink-dim)', fontSize: 12 }}
                        />
                        <Tooltip
                          cursor={{ fill: 'var(--bg-press)' }}
                          content={({ active, payload, label: day }) =>
                            active && payload?.length ? (
                              <div className="chart-tooltip">
                                <span>{day}</span>
                                <strong>
                                  {data.operation
                                    ? translate('{count} entradas', {
                                        count: integer(Number(payload[0].value)),
                                      })
                                    : money(Number(payload[0].value))}
                                </strong>
                              </div>
                            ) : null
                          }
                        />
                        <Bar
                          isAnimationActive={false}
                          dataKey="value"
                          name={data.operation ? translate('Entradas') : translate('Recebido')}
                          fill="var(--viz-1)"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={24}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    title={translate('Os próximos dias começam aqui')}
                    description={translate('Os movimentos registrados aparecerão neste gráfico.')}
                  />
                )}
                <div className="chart-legend">
                  <span />
                  {data.operation
                    ? translate('Entradas de veículos')
                    : translate('Recebimentos confirmados')}
                </div>
              </section>

              <aside className="quick-panel">
                <div className="quick-icon">
                  <Sparkles size={32} />
                </div>
                <p className="eyebrow">{translate('CONTROLE TOTAL DO PÁTIO')}</p>
                <h2>
                  {translate('Agilidade e precisão')}
                  <br />
                  {translate('na palma da mão.')}
                </h2>
                <p>
                  {data.operation
                    ? translate(
                        'Identifique veículos pela placa com IA, registre serviços de estética automotiva e emita cobranças via Pix Asaas.',
                      )
                    : translate(
                        'Acompanhe recebimentos, emita faturas e controle inadimplência com poucos cliques.',
                      )}
                </p>
                <Link
                  data-testid="overview-quick"
                  to={data.operation ? '/estacionamento' : '/pagamentos'}
                  className="quick-link"
                >
                  {data.operation
                    ? translate('Acompanhar operação completa')
                    : translate('Consultar pagamentos')}
                  <ArrowUpRight size={20} />
                </Link>
                <div className="parking-art" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </aside>
            </div>

            <section className="panel">
              <div className="panel-toolbar">
                <div>
                  <h2>
                    {data.operation
                      ? translate('Últimas estadias no pátio')
                      : translate('Últimos pagamentos')}
                  </h2>
                  <span>{translate('Os registros mais recentes da sua operação')}</span>
                </div>
                <Link
                  data-testid="overview-all"
                  className="text-link"
                  to={data.operation ? '/estacionamento' : '/pagamentos'}
                >
                  {translate('Ver todos ')}
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              {data.operation ? (
                data.stays.length ? (
                  <DataTable
                    rows={[...data.stays].sort((a, b) => b.estadiaId - a.estadiaId).slice(0, 5)}
                    rowKey={(r) => r.estadiaId}
                    caption={translate('Últimas estadias')}
                    testId="recent-table"
                    columns={[
                      {
                        label: 'Veículo',
                        render: (r) => {
                          const v = data.vehicles.find((x) => x.veiculoId === r.veiculoId);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span className="plate">{v?.placa || '#' + r.veiculoId}</span>
                              <small style={{ color: 'var(--ink-dim)', fontSize: '11px' }}>
                                {v
                                  ? `${v.marca || ''} ${v.modelo || ''}`.trim()
                                  : translate('Estadia #{id}', { id: r.estadiaId })}
                              </small>
                            </div>
                          );
                        },
                      },
                      {
                        label: 'Permanência',
                        render: (r) => (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Timer
                              size={14}
                              style={{
                                color:
                                  r.status === 'EM_ANDAMENTO' ? 'var(--ok)' : 'var(--ink-faint)',
                              }}
                            />
                            <span
                              style={{
                                fontWeight: 650,
                                color: r.status === 'EM_ANDAMENTO' ? 'var(--ok)' : 'var(--ink-dim)',
                              }}
                            >
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
                        label: 'Ações',
                        render: (r) => (
                          <Button
                            variant="ghost"
                            onClick={() => setSelectedStay(r.estadiaId)}
                            style={{ fontWeight: 600 }}
                          >
                            {translate('Ver detalhes ')}
                            <ArrowUpRight size={16} />
                          </Button>
                        ),
                      },
                    ]}
                  />
                ) : (
                  <EmptyState
                    title={translate('Pronto para o primeiro atendimento')}
                    description={translate(
                      'Cadastre os veículos e registre uma entrada para começar.',
                    )}
                  />
                )
              ) : data.payments.length ? (
                <DataTable
                  rows={[...data.payments]
                    .sort((a, b) => b.pagamentoId - a.pagamentoId)
                    .slice(0, 5)}
                  rowKey={(r) => r.pagamentoId}
                  caption={translate('Últimos pagamentos')}
                  testId="recent-payments"
                  columns={[
                    { label: 'Pagamento', render: (r) => '#' + r.pagamentoId },
                    { label: 'Valor', render: (r) => money(r.valorCentavos / 100) },
                    {
                      label: 'Situação',
                      render: (r) => <StatusBadge status={r.status} label={label(r.status)} />,
                    },
                  ]}
                />
              ) : (
                <EmptyState
                  title={translate('Nenhum pagamento registrado')}
                  description={translate('Os próximos registros aparecerão aqui.')}
                />
              )}
            </section>
          </>
        )
      )}

      {data && (
        <Modal
          open={table}
          onClose={() => setTable(false)}
          title={translate('Movimento do Estacionamento')}
          size="md"
          actions={
            <Button variant="secondary" onClick={() => setTable(false)}>
              {translate('Fechar')}
            </Button>
          }
        >
          <p className="movement-modal-description">
            {translate('Histórico detalhado dos últimos 7 dias.')}
          </p>
          <DataTable
            rows={movementRows}
            columns={[
              {
                label: 'Data',
                render: (row) => (
                  <>
                    <strong>{row.label}</strong> <small>({row.weekday})</small>
                  </>
                ),
              },
              ...(data.operation
                ? [
                    {
                      label: 'Entradas',
                      render: (row: (typeof movementRows)[number]) => integer(row.entries),
                    },
                    {
                      label: 'Saídas',
                      render: (row: (typeof movementRows)[number]) => integer(row.exits),
                    },
                  ]
                : []),
              ...(data.financial
                ? [
                    {
                      label: 'Faturamento',
                      render: (row: (typeof movementRows)[number]) => money(row.revenue / 100),
                    },
                  ]
                : []),
            ]}
            rowKey={(row) => row.day}
            caption={translate('Movimento do estacionamento nos últimos sete dias')}
            testId="movement-table"
          />
          <div className="movement-total-row">
            <strong>{translate('Total no período')}</strong>
            {data.operation && (
              <span>
                {translate('{count} entradas', { count: integer(movementTotals.entries) })}
              </span>
            )}
            {data.operation && (
              <span>{translate('{count} saídas', { count: integer(movementTotals.exits) })}</span>
            )}
            {data.financial && <strong>{money(movementTotals.revenue / 100)}</strong>}
          </div>
        </Modal>
      )}
      {selectedStay !== null && (
        <StayDetails id={selectedStay} onClose={() => setSelectedStay(null)} />
      )}
    </>
  );
}

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Activity, Clock3, Globe2, MonitorSmartphone, RefreshCw, Users } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button, Field, Modal, SelectField, Skeleton } from '../../../ui';
import { DataTable } from '../../../components/DataTable';
import { Pagination } from '../../../components/Pagination';
import { QueryError } from '../../../components/QueryError';
import { useMonitoringDetail, useMonitoringLogs, useMonitoringOverview } from './api';
import { displayDate, monitoringDateRange, periodDates, type MonitoringPeriod } from './dates';
import { completeMonitoringTraffic } from './traffic';
import { OriginMap } from './OriginMap';
import type {
  MonitoringCount,
  MonitoringFilters,
  MonitoringLogDetail,
  MonitoringOverview,
} from './types';
import './monitoring.css';

const number = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
const percent = (value: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value) + '%';
const duration = (value: number | null | undefined) =>
  value === null || value === undefined ? 'Sem amostras' : number(Math.round(value)) + ' ms';
const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
const shortDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={'telemetry-panel ' + className}>{children}</section>;
}
function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="telemetry-panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
}
function Bars({
  title,
  items,
  total,
  limit = 6,
  blue = false,
}: {
  title: string;
  items: MonitoringCount[];
  total: number;
  limit?: number;
  blue?: boolean;
}) {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className={'telemetry-breakdown' + (blue ? ' is-blue' : '')}>
      <h3>{title}</h3>
      {!items.length ? (
        <p className="telemetry-note">Sem dados no período.</p>
      ) : (
        <ul>
          {items.slice(0, limit).map((item) => (
            <li key={item.name}>
              <div>
                <span>{item.name || 'Não informado'}</span>
                <small>
                  {number(item.count)} · {percent(total ? (item.count / total) * 100 : 0)}
                </small>
              </div>
              <span className="telemetry-bar" aria-hidden="true">
                <span style={{ width: (item.count / maximum) * 100 + '%' }} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {items.length > limit && (
        <details className="telemetry-table-toggle">
          <summary>Ver todos ({items.length})</summary>
          <ul>
            {items.slice(limit).map((item) => (
              <li key={item.name}>
                <div>
                  <span>{item.name}</span>
                  <small>
                    {number(item.count)} · {percent(total ? (item.count / total) * 100 : 0)}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
function Metrics({ data }: { data: MonitoringOverview }) {
  const ttfb = data.initialPageTtfb;
  const mobile = ttfb.mobileSampleCount > 0;
  return (
    <div className="telemetry-metrics" data-testid="monitoring-metrics">
      <article className="telemetry-metric">
        <span className="telemetry-metric-icon">
          <Activity size={18} />
        </span>
        <h2>Total de requisições</h2>
        <strong data-testid="monitoring-total-requests">{number(data.totalRequests)}</strong>
        <p>No período selecionado</p>
        <div className="telemetry-metric-foot">
          <span>{number(data.uniqueIps)} IPs únicos</span>
          <span>{number(data.botRequests)} bots/crawlers</span>
        </div>
      </article>
      <article className="telemetry-metric">
        <span className="telemetry-metric-icon">
          <Users size={18} />
        </span>
        <h2>Sessões únicas</h2>
        <strong data-testid="monitoring-unique-sessions">{number(data.uniqueSessions)}</strong>
        <p>Identificadores analíticos distintos</p>
        <div className="telemetry-metric-foot">
          <span>Uma sessão por aba do navegador</span>
        </div>
      </article>
      <article className="telemetry-metric telemetry-metric-ttfb">
        <span className="telemetry-metric-icon">
          <Clock3 size={18} />
        </span>
        <h2>TTFB da página inicial</h2>
        <small>{mobile ? 'p75 mobile' : 'p75 de todas as amostras'}</small>
        <strong data-testid="monitoring-ttfb" className={!ttfb.sampleCount ? 'is-empty' : ''}>
          {duration(mobile ? ttfb.mobileP75Ms : ttfb.p75Ms)}
        </strong>
        <p>
          {mobile
            ? number(ttfb.mobileSampleCount) + ' amostras mobile'
            : number(ttfb.sampleCount) + ' amostras válidas'}
        </p>
        <dl className="telemetry-mini-stats">
          <dt>Todos os dispositivos</dt>
          <dd>{number(ttfb.sampleCount)} amostras</dd>
          <dt>p75</dt>
          <dd>{duration(ttfb.p75Ms)}</dd>
          <dt>p95</dt>
          <dd>{duration(ttfb.p95Ms)}</dd>
          <dt>Média</dt>
          <dd>{duration(ttfb.averageMs)}</dd>
        </dl>
      </article>
      <article className="telemetry-metric">
        <span className="telemetry-metric-icon">
          <MonitorSmartphone size={18} />
        </span>
        <h2>Predominância mobile</h2>
        <strong data-testid="monitoring-mobile-share">{percent(data.mobilePercentage)}</strong>
        <p>Dos acessos no período</p>
        <div className="telemetry-metric-foot">
          <span>{number(data.mobileRequests)} acessos mobile</span>
          <span>{percent(data.touchPercentage)} com toque</span>
        </div>
      </article>
    </div>
  );
}
function Traffic({ data, filters }: { data: MonitoringOverview; filters: MonitoringFilters }) {
  const traffic = completeMonitoringTraffic(
    data.traffic,
    filters.startDate,
    filters.endDate,
    data.trafficGranularity,
  );
  const trafficLabel =
    data.trafficGranularity === 'hour'
      ? (value: string) =>
          new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(value))
      : shortDate;
  return (
    <Panel>
      <Heading
        title="Evolução do tráfego"
        subtitle="Volume de acessos e tempo de processamento da API. Horário de Brasília."
      />
      {data.traffic.length ? (
        <>
          <div className="telemetry-charts">
            <div>
              <h3>Requisições</h3>
              <div
                className="telemetry-chart"
                role="img"
                aria-label="Gráfico de requisições. Valores disponíveis em Ver tabela."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={traffic} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={trafficLabel}
                      tick={{ fill: 'var(--ink-faint)', fontSize: 10 }}
                      minTickGap={22}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={38}
                      tick={{ fill: 'var(--ink-faint)', fontSize: 10 }}
                    />
                    <Tooltip
                      labelFormatter={(value) => trafficLabel(String(value))}
                      contentStyle={{
                        background: 'var(--bg-raise)',
                        border: '1px solid var(--line)',
                        borderRadius: 10,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      name="Requisições"
                      stroke="var(--viz-6)"
                      fill="var(--viz-6)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3>Tempo médio de resposta HTTP (ms)</h3>
              <div
                className="telemetry-chart"
                role="img"
                aria-label="Gráfico de tempo médio de resposta HTTP. Valores disponíveis em Ver tabela."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={traffic} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={trafficLabel}
                      tick={{ fill: 'var(--ink-faint)', fontSize: 10 }}
                      minTickGap={22}
                    />
                    <YAxis width={45} tick={{ fill: 'var(--ink-faint)', fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={(value) => trafficLabel(String(value))}
                      contentStyle={{
                        background: 'var(--bg-raise)',
                        border: '1px solid var(--line)',
                        borderRadius: 10,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="averageResponseTimeMs"
                      name="Tempo médio (ms)"
                      stroke="var(--viz-2)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="telemetry-traffic-footer">
            <span>
              <i />
              Sucesso HTTP 2xx:{' '}
              <strong>
                {data.httpRequests ? percent(data.successPercentage) : 'Sem amostras'}
              </strong>
            </span>
            <span>
              Erros HTTP:{' '}
              <strong>
                {number(data.errorRequests)} (
                {data.httpRequests ? percent(data.errorRate) : 'sem amostras'})
              </strong>
            </span>
            <span>
              Média HTTP: <strong>{duration(data.averageResponseTimeMs)}</strong>
            </span>
          </div>
          <details className="telemetry-table-toggle">
            <summary>Ver tabela da evolução</summary>
            <DataTable
              testId="monitoring-traffic-table"
              caption="Evolução do tráfego"
              rows={traffic}
              rowKey={(row) => row.timestamp}
              columns={[
                { label: 'Data (Brasília)', render: (row) => dateTime(row.timestamp) },
                { label: 'Requisições', render: (row) => number(row.requests) },
                { label: 'Erros HTTP', render: (row) => number(row.errors) },
                { label: 'Tempo médio HTTP', render: (row) => duration(row.averageResponseTimeMs) },
              ]}
            />
          </details>
        </>
      ) : (
        <p className="telemetry-empty">Sem tráfego registrado no período.</p>
      )}
    </Panel>
  );
}
function Resolutions({ data }: { data: MonitoringOverview }) {
  const [tab, setTab] = useState<'screen' | 'viewport' | 'density' | 'ranges'>('screen');
  const ranges = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of data.screenResolutions) {
      const width = Number.parseInt(item.name, 10);
      const group = !Number.isFinite(width)
        ? 'Não informado'
        : width < 600
          ? 'Até 599 px'
          : width < 900
            ? '600 a 899 px'
            : width < 1200
              ? '900 a 1199 px'
              : '1200 px ou mais';
      counts.set(group, (counts.get(group) ?? 0) + item.count);
    }
    return [...counts].map(([name, count]) => ({ name, count }));
  }, [data.screenResolutions]);
  const selected =
    tab === 'screen'
      ? data.screenResolutions
      : tab === 'viewport'
        ? data.viewportResolutions
        : tab === 'density'
          ? data.pixelRatios
          : ranges;
  return (
    <Panel>
      <Heading
        title="Resoluções e viewport"
        subtitle="Dimensões mais frequentes entre os acessos do período."
      />
      <div className="telemetry-tabs" aria-label="Dimensão analisada">
        {(
          [
            ['screen', 'Tela física'],
            ['viewport', 'Área útil'],
            ['density', 'Densidade'],
            ['ranges', 'Faixas'],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            data-testid={'monitoring-resolution-' + value}
          >
            {label}
          </button>
        ))}
      </div>
      <Bars
        title={
          tab === 'density'
            ? 'Densidade de pixels (DPR)'
            : tab === 'ranges'
              ? 'Faixas de largura da tela'
              : 'Largura × altura (px)'
        }
        items={selected}
        total={data.totalRequests}
        limit={8}
      />
      <p className="telemetry-note">
        Screen e viewport são informados pelo navegador em pixels CSS. Recursos não disponíveis
        aparecem como não informados.
      </p>
    </Panel>
  );
}
const detailFields: { key: keyof MonitoringLogDetail; label: string }[] = [
  { key: 'createdAt', label: 'Data (Brasília)' },
  { key: 'ipAddress', label: 'Endereço IP' },
  { key: 'forwardedFor', label: 'Forwarded for' },
  { key: 'method', label: 'Método' },
  { key: 'url', label: 'URL' },
  { key: 'queryString', label: 'Query string' },
  { key: 'pageHost', label: 'Host da página' },
  { key: 'referrer', label: 'Referência' },
  { key: 'statusCode', label: 'Status HTTP' },
  { key: 'responseTimeMs', label: 'Tempo registrado (ms)' },
  { key: 'protocol', label: 'Protocolo' },
  { key: 'country', label: 'País' },
  { key: 'region', label: 'Estado / região' },
  { key: 'city', label: 'Cidade' },
  { key: 'postalCode', label: 'CEP' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'timeZone', label: 'Fuso horário' },
  { key: 'isp', label: 'Provedor' },
  { key: 'address', label: 'Endereço aproximado' },
  { key: 'deviceType', label: 'Tipo de aparelho' },
  { key: 'deviceBrand', label: 'Marca' },
  { key: 'deviceModel', label: 'Modelo' },
  { key: 'operatingSystem', label: 'Sistema operacional' },
  { key: 'browser', label: 'Navegador' },
  { key: 'browserVersion', label: 'Versão do navegador' },
  { key: 'userAgent', label: 'User agent' },
  { key: 'screenWidth', label: 'Largura da tela' },
  { key: 'screenHeight', label: 'Altura da tela' },
  { key: 'viewportWidth', label: 'Largura útil' },
  { key: 'viewportHeight', label: 'Altura útil' },
  { key: 'devicePixelRatio', label: 'Densidade (DPR)' },
  { key: 'colorDepth', label: 'Profundidade de cor' },
  { key: 'language', label: 'Idioma' },
  { key: 'hardwareConcurrency', label: 'Núcleos lógicos' },
  { key: 'deviceMemory', label: 'Memória informada (GB)' },
  { key: 'connectionEffectiveType', label: 'Rede efetiva' },
  { key: 'isTouchScreen', label: 'Tela sensível ao toque' },
  { key: 'userId', label: 'Usuário' },
  { key: 'sessionId', label: 'Sessão analítica' },
  { key: 'ipAddressCountry', label: 'País do IP' },
  { key: 'ipAddressRegion', label: 'Região do IP' },
  { key: 'ipAddressCity', label: 'Cidade do IP' },
];
function LogDetail({ id, onClose }: { id: number | null; onClose: () => void }) {
  const query = useMonitoringDetail(id);
  const data = query.data;
  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      title={'Detalhes do acesso #' + (id ?? '')}
      size="lg"
      actions={
        <Button variant="secondary" onClick={onClose} data-testid="monitoring-detail-close">
          Fechar
        </Button>
      }
    >
      {query.isPending ? (
        <div role="status">Carregando detalhes…</div>
      ) : query.isError ? (
        <QueryError
          error={query.error}
          what="os detalhes do acesso"
          onRetry={() => void query.refetch()}
        />
      ) : (
        data && (
          <>
            <dl className="telemetry-detail">
              {detailFields.map(({ key, label }) => {
                const value = data[key];
                return (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>
                      {value === null || value === undefined || value === ''
                        ? 'Não informado'
                        : key === 'createdAt'
                          ? dateTime(String(value))
                          : typeof value === 'boolean'
                            ? value
                              ? 'Sim'
                              : 'Não'
                            : String(value)}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="telemetry-note">
              Dados técnicos informados pelo navegador e pela conexão. Informações sensíveis são
              ocultadas na captura.
            </p>
            {(['headers', 'requestBody'] as const).map((key) => (
              <details className="telemetry-table-toggle" key={key}>
                <summary>
                  {key === 'headers' ? 'Cabeçalhos sanitizados' : 'Corpo da requisição sanitizado'}
                </summary>
                <pre className="telemetry-code">{data[key] || 'Não capturado'}</pre>
              </details>
            ))}
          </>
        )
      )}
    </Modal>
  );
}
export function BackofficeMonitoringPage() {
  const [period, setPeriod] = useState<MonitoringPeriod>('7');
  const [range, setRange] = useState(() => periodDates('7'));
  const [trafficType, setTrafficType] = useState('all');
  const [host, setHost] = useState('');
  const [ipDraft, setIpDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [extra, setExtra] = useState<{ ipAddress?: string; statusCode?: number }>({});
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<number | null>(null);
  const dates = monitoringDateRange(range.start, range.end);
  const filters: MonitoringFilters = {
    startDate: dates?.startDate ?? '',
    endDate: dates?.endDate ?? '',
    pageHost: host || undefined,
    type: trafficType === 'bots' ? 'bots' : undefined,
    excludeBots: trafficType === 'humans' || undefined,
    ...extra,
  };
  const overview = useMonitoringOverview(filters, !!dates);
  const logs = useMonitoringLogs(filters, page, !!dates);
  const data = overview.data;
  function changePeriod(value: MonitoringPeriod) {
    setPeriod(value);
    if (value !== 'custom') setRange(periodDates(value));
    setPage(1);
  }
  function applyExtra(event: FormEvent) {
    event.preventDefault();
    setExtra({
      ipAddress: ipDraft.trim() || undefined,
      statusCode: statusDraft ? Number(statusDraft) : undefined,
    });
    setPage(1);
  }
  return (
    <div className="telemetry-page" data-testid="monitoring-page">
      <header className="telemetry-hero">
        <div>
          <span className="telemetry-eyebrow">
            <Globe2 size={14} /> INTELIGÊNCIA DE ACESSOS
          </span>
          <h1>Monitoramento de Acessos e Dispositivos</h1>
          <p>Acompanhe o volume, a origem, o perfil técnico e o desempenho dos acessos.</p>
        </div>
        <span className="telemetry-timezone">
          <Clock3 size={14} />
          Horário de Brasília
        </span>
      </header>
      <section className="telemetry-filters" aria-label="Filtros de monitoramento">
        <SelectField
          label="Período"
          value={period}
          data-testid="monitoring-period"
          onChange={(event) => changePeriod(event.target.value as MonitoringPeriod)}
        >
          <option value="today">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="custom">Personalizado</option>
        </SelectField>
        <SelectField
          label="Tipo de tráfego"
          value={trafficType}
          data-testid="monitoring-traffic-type"
          onChange={(event) => {
            setTrafficType(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Todos os acessos</option>
          <option value="humans">Ocultar Bots/Crawlers</option>
          <option value="bots">Somente Bots/Crawlers</option>
        </SelectField>
        <SelectField
          label="Host"
          value={host}
          data-testid="monitoring-host"
          onChange={(event) => {
            setHost(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os hosts</option>
          {Array.from(
            new Set([...(data?.hosts ?? []), ...(host && host !== '__unknown__' ? [host] : [])]),
          ).map((value) => (
            <option value={value} key={value}>
              {value}
            </option>
          ))}
          <option value="__unknown__">Host não informado</option>
        </SelectField>
        <span className="telemetry-date-range">
          {displayDate(range.start)} – {displayDate(range.end)}
        </span>
        <Button
          variant="ghost"
          aria-label="Atualizar monitoramento"
          data-testid="monitoring-refresh"
          disabled={overview.isFetching || !dates}
          onClick={() => {
            void overview.refetch();
            void logs.refetch();
          }}
        >
          <RefreshCw size={16} />
        </Button>
        {period === 'custom' && (
          <div className="telemetry-custom-range">
            <Field
              label="Data inicial"
              type="date"
              value={range.start}
              max={range.end}
              data-testid="monitoring-start-date"
              onChange={(event) => {
                setRange({ ...range, start: event.target.value });
                setPage(1);
              }}
            />
            <Field
              label="Data final"
              type="date"
              value={range.end}
              min={range.start}
              data-testid="monitoring-end-date"
              onChange={(event) => {
                setRange({ ...range, end: event.target.value });
                setPage(1);
              }}
            />
          </div>
        )}
        <details className="telemetry-extra-filters">
          <summary>Mais filtros</summary>
          <form onSubmit={applyExtra}>
            <Field
              label="Endereço IP"
              value={ipDraft}
              maxLength={45}
              placeholder="IPv4 ou IPv6"
              data-testid="monitoring-ip"
              onChange={(event) => setIpDraft(event.target.value)}
            />
            <Field
              label="Status HTTP"
              type="number"
              min={100}
              max={599}
              step={1}
              value={statusDraft}
              placeholder="Ex.: 500"
              data-testid="monitoring-status"
              onChange={(event) => setStatusDraft(event.target.value)}
            />
            <Button type="submit" variant="secondary" data-testid="monitoring-apply-filters">
              Aplicar filtros
            </Button>
            <Button
              variant="ghost"
              type="button"
              data-testid="monitoring-clear-filters"
              onClick={() => {
                setIpDraft('');
                setStatusDraft('');
                setExtra({});
                setPage(1);
              }}
            >
              Limpar IP e status
            </Button>
          </form>
        </details>
      </section>
      {!dates ? (
        <p role="alert" className="telemetry-empty">
          Informe um período válido, com data final igual ou posterior à inicial e até 366 dias.
        </p>
      ) : overview.isPending ? (
        <div role="status" aria-label="Carregando monitoramento">
          <Skeleton />
        </div>
      ) : overview.isError ? (
        <QueryError
          error={overview.error}
          what="o monitoramento"
          onRetry={() => void overview.refetch()}
        />
      ) : (
        data && (
          <>
            {overview.isFetching && (
              <p role="status" className="telemetry-note">
                Atualizando indicadores…
              </p>
            )}
            <Metrics data={data} />
            {data.totalRequests === 0 && (
              <p className="telemetry-empty" data-testid="monitoring-empty">
                Nenhum acesso encontrado para os filtros selecionados.
              </p>
            )}
            <div className="telemetry-origin-grid">
              <Panel>
                <OriginMap locations={data.locations} />
                <div className="telemetry-geography">
                  <h3>Principais países e estados</h3>
                  <div>
                    {data.countries.slice(0, 4).map((item) => (
                      <span className="telemetry-location-chip" key={'country-' + item.name}>
                        {item.name}
                        <strong>{number(item.count)}</strong>
                      </span>
                    ))}
                    {data.regions.slice(0, 3).map((item) => (
                      <span className="telemetry-location-chip" key={'region-' + item.name}>
                        {item.name}
                        <strong>{number(item.count)}</strong>
                      </span>
                    ))}
                  </div>
                  {!data.countries.length && !data.regions.length && (
                    <p className="telemetry-note">Origem não informada no período.</p>
                  )}
                </div>
              </Panel>
              <Panel>
                <Heading title="Aparelhos e sistemas" />
                <Bars
                  title="Tipo de aparelho"
                  items={data.devices}
                  total={data.totalRequests}
                  limit={3}
                />
                <Bars
                  title="Sistema operacional"
                  items={data.operatingSystems}
                  total={data.totalRequests}
                  limit={3}
                />
                <Bars title="Marcas" items={data.brands} total={data.totalRequests} limit={3} />
                <Bars title="Modelos" items={data.models} total={data.totalRequests} limit={3} />
              </Panel>
            </div>
            <Traffic data={data} filters={filters} />
            <div className="telemetry-equal-grid">
              <Resolutions data={data} />
              <Panel>
                <Heading
                  title="Perfil técnico"
                  subtitle="Navegador, protocolo, conexão e suporte ao toque."
                />
                <div className="telemetry-technical-grid">
                  <Bars title="Navegador" items={data.browsers} total={data.totalRequests} />
                  <Bars title="Protocolo" items={data.protocols} total={data.totalRequests} blue />
                  <Bars
                    title="Rede efetiva"
                    items={data.connectionTypes}
                    total={data.totalRequests}
                    blue
                  />
                  <Bars
                    title="Tela sensível ao toque"
                    items={[
                      { name: 'Com toque', count: data.touchRequests },
                      {
                        name: 'Sem toque ou não informado',
                        count: Math.max(0, data.totalRequests - data.touchRequests),
                      },
                    ]}
                    total={data.totalRequests}
                  />
                </div>
              </Panel>
            </div>
            <Panel>
              <Heading
                title="Acessos por localidade e dispositivo"
                subtitle="Origem, perfil de navegação e desempenho dos grupos no período."
              />
              {data.localityDevices.length ? (
                <DataTable
                  testId="monitoring-localities"
                  caption="Acessos por localidade e dispositivo"
                  rows={data.localityDevices}
                  rowKey={(row) =>
                    [
                      row.location,
                      row.deviceType,
                      row.operatingSystem,
                      row.browser,
                      row.screenResolution,
                    ].join('|')
                  }
                  columns={[
                    { label: 'Localidade', render: (row) => row.location },
                    { label: 'Aparelho', render: (row) => row.deviceType },
                    {
                      label: 'SO / Navegador',
                      render: (row) => row.operatingSystem + ' / ' + row.browser,
                    },
                    { label: 'Tela predominante', render: (row) => row.screenResolution },
                    { label: 'Requisições', render: (row) => number(row.requests) },
                    { label: '% do total', render: (row) => percent(row.percentage) },
                    {
                      label: 'Tempo médio HTTP',
                      render: (row) => duration(row.averageResponseTimeMs),
                    },
                  ]}
                />
              ) : (
                <p className="telemetry-empty">Sem dados de localidade e dispositivo.</p>
              )}
            </Panel>
            <div className="telemetry-equal-grid">
              <Panel>
                <Heading
                  title="Origem do tráfego"
                  subtitle="Referências identificadas nos acessos."
                />
                <Bars title="Referências" items={data.referrers} total={data.totalRequests} />
              </Panel>
              <Panel>
                <Heading title="Campanhas e respostas" />
                <Bars title="Campanhas UTM" items={data.campaigns} total={data.totalRequests} />
                <Bars title="Status HTTP" items={data.statusCodes} total={data.httpRequests} />
              </Panel>
            </div>
          </>
        )
      )}
      {dates && (
        <Panel>
          <Heading
            title="Histórico de acessos"
            subtitle="Registros individuais, do mais recente ao mais antigo. Horário de Brasília."
          />
          {logs.isPending ? (
            <div role="status">Carregando acessos…</div>
          ) : logs.isError ? (
            <QueryError
              error={logs.error}
              what="o histórico de acessos"
              onRetry={() => void logs.refetch()}
            />
          ) : (
            logs.data && (
              <>
                {!logs.data.items.length ? (
                  <p className="telemetry-empty">Nenhum registro encontrado.</p>
                ) : (
                  <DataTable
                    testId="monitoring-logs"
                    caption="Histórico de acessos"
                    rows={logs.data.items}
                    rowKey={(row) => row.id}
                    columns={[
                      { label: 'Data', render: (row) => dateTime(row.createdAt) },
                      {
                        label: 'IP / Host',
                        render: (row) => (
                          <>
                            <strong>{row.ipAddress}</strong>
                            <small className="telemetry-cell-sub">
                              {row.pageHost || 'Host não informado'}
                            </small>
                          </>
                        ),
                      },
                      {
                        label: 'Página / Método',
                        render: (row) => (
                          <>
                            <span className="telemetry-url">{row.url}</span>
                            <small className="telemetry-cell-sub">
                              {row.method === 'PAGEVIEW' ? 'Navegação da página' : row.method}
                            </small>
                          </>
                        ),
                      },
                      {
                        label: 'Dispositivo',
                        render: (row) =>
                          [row.deviceType, row.browser].filter(Boolean).join(' / ') ||
                          'Não informado',
                      },
                      { label: 'Status HTTP', render: (row) => row.statusCode ?? '—' },
                      { label: 'Tempo registrado', render: (row) => duration(row.responseTimeMs) },
                      {
                        label: 'Detalhes',
                        render: (row) => (
                          <Button
                            variant="ghost"
                            data-testid={'monitoring-detail-' + row.id}
                            onClick={() => setDetail(row.id)}
                          >
                            Ver detalhes
                          </Button>
                        ),
                      },
                    ]}
                  />
                )}
                <Pagination
                  page={page}
                  size={20}
                  total={logs.data.totalCount}
                  onChange={setPage}
                  busy={logs.isFetching}
                />
              </>
            )
          )}
        </Panel>
      )}
      <p className="telemetry-note telemetry-coverage">
        Cobertura: requisições recebidas pela API e navegações que executam JavaScript. Bots que
        acessam somente arquivos estáticos precisam ser coletados pelo servidor ou proxy do
        frontend. TTFB mede apenas a primeira navegação do documento; o tempo HTTP mede o
        processamento no servidor.
      </p>
      <LogDetail id={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

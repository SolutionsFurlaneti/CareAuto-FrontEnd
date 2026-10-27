import { AlertTriangle, CalendarClock, CircleDollarSign, Play, Store, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { MetricCard } from '../../components/MetricCard';
import { QueryError } from '../../components/QueryError';
import { Button, Skeleton } from '../../ui';
import { dateOnly, dateTime, money } from '../../lib/format';
import { executarRotina, type ResultadoRotina } from './api';
import { useBackofficeAction, useResumo } from './hooks';

export function BackofficeOverviewPage() {
  const resumo = useResumo();
  const rodar = useBackofficeAction(executarRotina, (r: ResultadoRotina) =>
    r.asaasConfigurado
      ? `Rotina concluída: ${r.emitidas} emitida(s), ${r.sincronizadas} conciliada(s), ${r.falhas} falha(s).`
      : 'Asaas da plataforma não configurado: nenhuma cobrança foi emitida.',
  );
  const r = resumo.data;
  return (
    <>
      <PageHeader
        eyebrow="PLATAFORMA"
        title="Visão geral"
        description="Assinantes do CareAuto, receita recorrente e a rotina diária de cobrança."
      />
      {resumo.isPending ? (
        <Skeleton />
      ) : resumo.isError ? (
        <QueryError error={resumo.error} what="o resumo" onRetry={() => void resumo.refetch()} />
      ) : (
        r && (
          <>
            <div className="metrics" data-testid="bo-metrics">
              <MetricCard
                accent
                label="Receita recorrente"
                value={money(r.receitaMensalRecorrente)}
                note="por mês, assinaturas pagantes"
                icon={<CircleDollarSign size={18} />}
              />
              <MetricCard
                label="Assinantes ativos"
                value={String(r.ativas)}
                note={`${r.emTrial} em período grátis`}
                icon={<Users size={18} />}
              />
              <MetricCard
                label="Inadimplentes"
                value={String(r.inadimplentes)}
                note={`${r.cobrancasAbertas} cobrança(s) em aberto · ${money(r.valorEmAberto)}`}
                icon={<AlertTriangle size={18} />}
              />
              <MetricCard
                label="Estabelecimentos"
                value={String(r.estabelecimentos)}
                note={`${r.semAssinatura} sem assinatura · ${r.canceladas} cancelada(s)`}
                icon={<Store size={18} />}
              />
            </div>
            <section className="panel" aria-labelledby="bo-rotina" data-testid="bo-rotina">
              <div className="panel-toolbar">
                <div>
                  <h2 id="bo-rotina">Rotina diária de cobrança</h2>
                  <span>
                    {r.rotina.habilitada
                      ? `Roda uma vez por dia a partir das ${String(r.rotina.hora).padStart(2, '0')}h (horário de Brasília).`
                      : 'Agendamento desabilitado neste servidor; use Executar agora.'}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  busy={rodar.isPending}
                  data-testid="bo-rotina-executar"
                  onClick={() => rodar.mutate(undefined)}
                >
                  <Play size={16} /> Executar agora
                </Button>
              </div>
              <div className="integration-body">
                <p>
                  Concilia as cobranças abertas no Asaas e emite o boleto dos planos pós-pagos
                  quando faltam 2 dias para o vencimento. Se o servidor estiver fora no dia, o
                  boleto sai na execução seguinte.
                </p>
                <dl className="detail-grid">
                  <div>
                    <dt>Última execução</dt>
                    <dd data-testid="bo-rotina-ultima">
                      {r.rotina.executadaEm
                        ? `${dateTime(r.rotina.executadaEm)} · ${r.rotina.origem === 'MANUAL' ? 'manual' : 'agendada'}`
                        : 'Ainda não executada'}
                    </dd>
                  </div>
                  <div>
                    <dt>Agendamento diário</dt>
                    <dd>
                      {r.rotina.ultimaData
                        ? `Último dia processado: ${dateOnly(r.rotina.ultimaData)}`
                        : 'Ainda não processado'}
                    </dd>
                  </div>
                  <div>
                    <dt>Resultado</dt>
                    <dd>
                      {r.rotina.ultimoResultado
                        ? r.rotina.ultimoResultado.asaasConfigurado
                          ? `${r.rotina.ultimoResultado.emitidas} emitida(s) · ${r.rotina.ultimoResultado.sincronizadas} conciliada(s) · ${r.rotina.ultimoResultado.falhas} falha(s)`
                          : 'Asaas não configurado'
                        : '—'}
                    </dd>
                  </div>
                </dl>
                {!!rodar.data?.mensagens.length && (
                  <ul className="notice bo-messages" data-testid="bo-rotina-mensagens">
                    {rodar.data.mensagens.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
                <p>
                  <CalendarClock size={14} aria-hidden="true" />{' '}
                  <Link className="text-link" to="/backoffice/cobrancas">
                    Ver cobranças
                  </Link>{' '}
                  ·{' '}
                  <Link className="text-link" to="/backoffice/integracoes">
                    Configurar Asaas
                  </Link>
                </p>
              </div>
            </section>
          </>
        )
      )}
    </>
  );
}


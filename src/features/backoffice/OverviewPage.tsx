import { useI18n } from '../../i18n';
import { AlertTriangle, CalendarClock, CircleDollarSign, Play, Store, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { MetricCard } from '../../components/MetricCard';
import { QueryError } from '../../components/QueryError';
import { Button, Skeleton } from '../../ui';
import { dateOnly, dateTime, integer, money } from '../../lib/format';
import { executarRotina, type ResultadoRotina } from './api';
import { useBackofficeAction, useResumo } from './hooks';

export function BackofficeOverviewPage() {
  const { t } = useI18n();
  const resumo = useResumo();
  const rodar = useBackofficeAction(executarRotina, (r: ResultadoRotina) =>
    r.asaasConfigurado
      ? t('Rotina concluída: {issued} emitida(s), {reconciled} conciliada(s), {failed} falha(s).', {
          issued: r.emitidas,
          reconciled: r.sincronizadas,
          failed: r.falhas,
        })
      : 'Asaas da plataforma não configurado: nenhuma cobrança foi emitida.',
  );
  const r = resumo.data;
  return (
    <>
      <PageHeader
        eyebrow="PLATAFORMA"
        title={t('Visão geral')}
        description={t('Assinantes do CareAuto, receita recorrente e a rotina diária de cobrança.')}
      />
      {resumo.isPending ? (
        <Skeleton />
      ) : resumo.isError ? (
        <QueryError
          error={resumo.error}
          what={t('o resumo')}
          onRetry={() => void resumo.refetch()}
        />
      ) : (
        r && (
          <>
            <div className="metrics" data-testid="bo-metrics">
              <MetricCard
                accent
                label={t('Receita recorrente')}
                value={money(r.receitaMensalRecorrente)}
                note={t('por mês, assinaturas pagantes')}
                icon={<CircleDollarSign size={18} />}
              />
              <MetricCard
                label={t('Assinantes ativos')}
                value={integer(r.ativas)}
                note={t('{count} em período grátis', { count: r.emTrial })}
                icon={<Users size={18} />}
              />
              <MetricCard
                label={t('Inadimplentes')}
                value={integer(r.inadimplentes)}
                note={t('{count} cobrança(s) em aberto · {amount}', {
                  count: r.cobrancasAbertas,
                  amount: money(r.valorEmAberto),
                })}
                icon={<AlertTriangle size={18} />}
              />
              <MetricCard
                label={t('Estabelecimentos')}
                value={integer(r.estabelecimentos)}
                note={t('{unsubscribed} sem assinatura · {canceled} cancelada(s)', {
                  unsubscribed: r.semAssinatura,
                  canceled: r.canceladas,
                })}
                icon={<Store size={18} />}
              />
            </div>
            <section className="panel" aria-labelledby="bo-rotina" data-testid="bo-rotina">
              <div className="panel-toolbar">
                <div>
                  <h2 id="bo-rotina">{t('Rotina diária de cobrança')}</h2>
                  <span>
                    {r.rotina.habilitada
                      ? t('Roda uma vez por dia a partir das {hour}h (horário de Brasília).', {
                          hour: String(r.rotina.hora).padStart(2, '0'),
                        })
                      : t('Agendamento desabilitado neste servidor; use Executar agora.')}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  busy={rodar.isPending}
                  data-testid="bo-rotina-executar"
                  onClick={() => rodar.mutate(undefined)}
                >
                  <Play size={16} /> {t('Executar agora')}{' '}
                </Button>
              </div>
              <div className="integration-body">
                <p>
                  {t(
                    'Concilia as cobranças abertas no Asaas e emite o boleto dos planos pós-pagos quando faltam 2 dias para o vencimento. Se o servidor estiver fora no dia, o boleto sai na execução seguinte.',
                  )}{' '}
                </p>
                <dl className="detail-grid">
                  <div>
                    <dt>{t('Última execução')}</dt>
                    <dd data-testid="bo-rotina-ultima">
                      {r.rotina.executadaEm
                        ? `${dateTime(r.rotina.executadaEm)} · ${r.rotina.origem === 'MANUAL' ? t('manual') : t('agendada')}`
                        : t('Ainda não executada')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Agendamento diário')}</dt>
                    <dd>
                      {r.rotina.ultimaData
                        ? t('Último dia processado: {date}', {
                            date: dateOnly(r.rotina.ultimaData),
                          })
                        : t('Ainda não processado')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Resultado')}</dt>
                    <dd>
                      {r.rotina.ultimoResultado
                        ? r.rotina.ultimoResultado.asaasConfigurado
                          ? t(
                              '{issued} emitida(s) · {reconciled} conciliada(s) · {failed} falha(s)',
                              {
                                issued: r.rotina.ultimoResultado.emitidas,
                                reconciled: r.rotina.ultimoResultado.sincronizadas,
                                failed: r.rotina.ultimoResultado.falhas,
                              },
                            )
                          : t('Asaas não configurado')
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
                    {t('Ver cobranças')}{' '}
                  </Link>{' '}
                  ·{' '}
                  <Link className="text-link" to="/backoffice/integracoes">
                    {t('Configurar Asaas')}{' '}
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

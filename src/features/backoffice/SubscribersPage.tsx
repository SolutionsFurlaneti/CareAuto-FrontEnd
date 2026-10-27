import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { DataTable } from '../../components/DataTable';
import { Pagination } from '../../components/Pagination';
import { Button, EmptyState, Modal, SelectField, Skeleton, StatusBadge, Switch } from '../../ui';
import { dateOnly, dateTime, money } from '../../lib/format';
import {
  assinar,
  cancelarAssinatura,
  gerarCobranca,
  prorrogarTrial,
  type Assinante,
  type FormaPagamento,
  type Situacao,
} from './api';
import { useAssinante, useAssinantes, useBackofficeAction, usePlanos } from './hooks';
import { documento, formaLabel, periodicidadeLabel, situacaoLabel, tipoLabel } from './labels';
import { ChargesTable } from './ChargesTable';

export const situacaoBadge: Record<Situacao, string> = {
  SEM_ASSINATURA: 'ENCERRADA',
  TRIAL: 'EM_EXECUCAO',
  ATIVA: 'ATIVA',
  INADIMPLENTE: 'ERRO',
  CANCELADA: 'CANCELADO',
};

function SubscriberModal({ id, onClose }: { id: number; onClose: () => void }) {
  const detalhe = useAssinante(id);
  const planos = usePlanos();
  const [planoId, setPlanoId] = useState('');
  const [trial, setTrial] = useState(true);
  const [forma, setForma] = useState<FormaPagamento>('BOLETO');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmTrialExtension, setConfirmTrialExtension] = useState(false);
  const d = detalhe.data;
  useEffect(() => {
    if (d)
      setPlanoId(
        d.assinatura && d.assinatura.status === 'ATIVA' ? String(d.assinatura.planoId) : '',
      );
  }, [d]);
  const salvar = useBackofficeAction(
    (v: { planoId: number; comTrial: boolean }) => assinar(id, v.planoId, v.comTrial),
    'Assinatura atualizada.',
  );
  const cancelar = useBackofficeAction(() => cancelarAssinatura(id), 'Assinatura cancelada.');
  const cobrar = useBackofficeAction(() => gerarCobranca(id, forma), 'Cobrança gerada.');
  const prorrogar = useBackofficeAction(
    (versao: string) => prorrogarTrial(id, versao),
    (r) =>
      r.emailStatus === 'ACEITO'
        ? 'Período grátis estendido em 7 dias. O provedor aceitou o e-mail.'
        : `Período grátis estendido em 7 dias, mas o e-mail ficou ${r.emailStatus}. Verifique o provedor antes de tentar novamente.`,
  );
  const ativa = d?.assinatura?.status === 'ATIVA';
  const trialEmAndamento = d?.assinatura?.situacao === 'TRIAL' ? d.assinatura : null;
  const atual = planos.data?.find((p) => p.planoId === d?.assinatura?.planoId);
  const opcoes = (planos.data ?? []).filter(
    (p) => p.ativo && (!ativa || !atual || p.tipo === atual.tipo),
  );
  const busy = salvar.isPending || cancelar.isPending || cobrar.isPending || prorrogar.isPending;
  const acao = !d?.assinatura ? 'Assinar plano' : ativa ? 'Trocar plano' : 'Reativar assinatura';
  return (
    <Modal
      open
      size="lg"
      title={d?.assinante.nome ?? 'Assinante'}
      busy={busy}
      onClose={onClose}
      actions={
        confirmCancel ? (
          <>
            <span className="modal-actions-note" role="alert">
              Cancelar interrompe novas cobranças deste estabelecimento.
            </span>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              busy={cancelar.isPending}
              data-testid="bo-sub-cancel-confirm"
              onClick={() =>
                cancelar.mutate(undefined, { onSuccess: () => setConfirmCancel(false) })
              }
            >
              Confirmar cancelamento
            </Button>
          </>
        ) : (
          <>
            {ativa && (
              <Button
                variant="ghost"
                data-testid="bo-sub-cancel"
                onClick={() => setConfirmCancel(true)}
              >
                Cancelar assinatura
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </>
        )
      }
    >
      {detalhe.isPending ? (
        <Skeleton />
      ) : detalhe.isError ? (
        <QueryError
          error={detalhe.error}
          what="o assinante"
          onRetry={() => void detalhe.refetch()}
        />
      ) : (
        d && (
          <div data-testid="bo-subscriber">
            <div className="detail-heading">
              <span>{documento(d.assinante.tipoPessoa, d.assinante.documento)}</span>
              <StatusBadge
                status={situacaoBadge[d.assinante.situacao]}
                label={situacaoLabel[d.assinante.situacao]}
              />
            </div>
            <dl className="detail-grid">
              <div>
                <dt>Dono</dt>
                <dd>{d.assinante.emailDono ?? '—'}</dd>
              </div>
              <div>
                <dt>Cadastrado em</dt>
                <dd>{dateTime(d.assinante.criadoEm)}</dd>
              </div>
              {d.assinatura && (
                <>
                  <div>
                    <dt>Plano</dt>
                    <dd data-testid="bo-sub-plano">
                      {d.assinatura.plano} · {tipoLabel[d.assinatura.tipoPlano]}{' '}
                      {periodicidadeLabel[d.assinatura.periodicidade].toLowerCase()}
                    </dd>
                  </div>
                  <div>
                    <dt>Valor por cobrança</dt>
                    <dd>{money(d.assinatura.valorPeriodo)}</dd>
                  </div>
                  {d.assinatura.trialFim && (
                    <div>
                      <dt>Período grátis até</dt>
                      <dd data-testid="bo-sub-trial">{dateOnly(d.assinatura.trialFim)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>
                      {d.assinatura.tipoPlano === 'POS_PAGO' ? 'Período atual' : 'Uso pago até'}
                    </dt>
                    <dd data-testid="bo-sub-periodo">
                      {d.assinatura.tipoPlano === 'POS_PAGO'
                        ? `${dateOnly(d.assinatura.periodoInicio)} a ${dateOnly(d.assinatura.periodoFim)} (vence no fim)`
                        : dateOnly(d.assinatura.periodoFim)}
                    </dd>
                  </div>
                </>
              )}
            </dl>
            {trialEmAndamento && (
              <div className="inset-form">
                <h3>Prorrogar período grátis</h3>
                <p className="muted">
                  Conceda mais 7 dias. A primeira data de cobrança será ajustada e o administrador
                  receberá um e-mail.
                </p>
                {confirmTrialExtension ? (
                  <div className="form-grid">
                    <p className="notice" role="alert">
                      O período grátis será estendido em 7 dias e o e-mail será enviado ao
                      administrador cadastrado.
                    </p>
                    <Button variant="secondary" onClick={() => setConfirmTrialExtension(false)}>
                      Voltar
                    </Button>
                    <Button
                      busy={prorrogar.isPending}
                      data-testid="bo-sub-trial-extend-confirm"
                      onClick={() =>
                        prorrogar.mutate(trialEmAndamento.versao, {
                          onSuccess: () => setConfirmTrialExtension(false),
                        })
                      }
                    >
                      Confirmar +7 dias e enviar e-mail
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={prorrogar.isPending}
                    data-testid="bo-sub-trial-extend"
                    onClick={() => setConfirmTrialExtension(true)}
                  >
                    Conceder mais 7 dias grátis
                  </Button>
                )}
              </div>
            )}
            <div className="inset-form">
              <h3>{acao}</h3>
              <div className="form-grid">
                <SelectField
                  label="Plano"
                  value={planoId}
                  data-testid="bo-sub-plan"
                  onChange={(e) => setPlanoId(e.target.value)}
                  hint={
                    ativa
                      ? 'A troca vale a partir da próxima cobrança (mesmo tipo de plano).'
                      : undefined
                  }
                >
                  <option value="">Selecione</option>
                  {opcoes.map((p) => (
                    <option key={p.planoId} value={p.planoId}>
                      {p.nome} — {tipoLabel[p.tipo]}{' '}
                      {periodicidadeLabel[p.periodicidade].toLowerCase()} · {money(p.valorPeriodo)}
                    </option>
                  ))}
                </SelectField>
                {d.podeUsarTrial ? (
                  <Switch
                    label="Oferecer 7 dias grátis"
                    description="A primeira cobrança só acontece depois do período grátis."
                    checked={trial}
                    onChange={setTrial}
                    data-testid="bo-sub-trial-switch"
                  />
                ) : (
                  <p className="muted">Período grátis já utilizado por este estabelecimento.</p>
                )}
                <Button
                  busy={salvar.isPending}
                  disabled={!planoId || (ativa && Number(planoId) === d.assinatura?.planoId)}
                  data-testid="bo-sub-save"
                  onClick={() =>
                    salvar.mutate({ planoId: Number(planoId), comTrial: d.podeUsarTrial && trial })
                  }
                >
                  {acao}
                </Button>
              </div>
              {!planos.isPending && !opcoes.length && (
                <p className="notice">Cadastre um plano ativo em Planos.</p>
              )}
            </div>
            {ativa && d.assinatura?.tipoPlano === 'PRE_PAGO' && (
              <div className="inset-form">
                <h3>Cobrar próximo pacote</h3>
                <div className="form-grid">
                  <SelectField
                    label="Forma de pagamento"
                    value={forma}
                    data-testid="bo-sub-forma"
                    onChange={(e) => setForma(e.target.value as FormaPagamento)}
                  >
                    {Object.entries(formaLabel).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </SelectField>
                  <Button
                    variant="secondary"
                    busy={cobrar.isPending}
                    data-testid="bo-sub-charge"
                    onClick={() => cobrar.mutate(undefined)}
                  >
                    Gerar cobrança
                  </Button>
                </div>
              </div>
            )}
            <div className="section-label">
              <h3>Cobranças</h3>
            </div>
            {d.cobrancas.length ? (
              <ChargesTable rows={d.cobrancas} testId="bo-sub-charges" />
            ) : (
              <p className="muted">Nenhuma cobrança ainda.</p>
            )}
          </div>
        )
      )}
    </Modal>
  );
}

export function BackofficeSubscribersPage() {
  const [busca, setBusca] = useState('');
  const [termo, setTermo] = useState('');
  const [situacao, setSituacao] = useState('');
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setTermo(busca.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);
  const lista = useAssinantes({
    busca: termo || undefined,
    situacao: situacao || undefined,
    pagina,
  });
  return (
    <>
      <PageHeader
        eyebrow="PLATAFORMA"
        title="Assinantes"
        description="Estabelecimentos cadastrados no CareAuto, seus planos e a situação da mensalidade."
      />
      <section className="panel">
        <div className="panel-toolbar bo-filters">
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Nome, CNPJ/CPF ou e-mail"
              aria-label="Buscar assinante"
              value={busca}
              data-testid="bo-sub-search"
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
          <SelectField
            label="Situação"
            value={situacao}
            data-testid="bo-sub-filter"
            onChange={(e) => {
              setSituacao(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todas</option>
            {Object.entries(situacaoLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </SelectField>
        </div>
        {lista.isPending ? (
          <Skeleton />
        ) : lista.isError ? (
          <QueryError
            error={lista.error}
            what="os assinantes"
            onRetry={() => void lista.refetch()}
          />
        ) : !lista.data.items.length ? (
          <EmptyState
            title="Nenhum estabelecimento"
            description="Nenhum estabelecimento corresponde ao filtro."
          />
        ) : (
          <>
            <DataTable<Assinante>
              testId="bo-subscribers"
              caption="Assinantes"
              rows={lista.data.items}
              rowKey={(a) => a.estabelecimentoId}
              columns={[
                { label: 'Estabelecimento', render: (a) => <strong>{a.nome}</strong> },
                { label: 'Documento', render: (a) => documento(a.tipoPessoa, a.documento) },
                {
                  label: 'Situação',
                  render: (a) => (
                    <StatusBadge
                      status={situacaoBadge[a.situacao]}
                      label={situacaoLabel[a.situacao]}
                    />
                  ),
                },
                {
                  label: 'Plano',
                  render: (a) => (a.plano ? `${a.plano} · ${tipoLabel[a.tipoPlano!]}` : '—'),
                },
                {
                  label: 'Grátis até / vencimento',
                  render: (a) =>
                    a.trialFim && a.situacao === 'TRIAL'
                      ? dateOnly(a.trialFim)
                      : a.periodoFim
                        ? dateOnly(a.periodoFim)
                        : '—',
                },
                {
                  label: 'Valor',
                  render: (a) => (a.valorPeriodo === null ? '—' : money(a.valorPeriodo)),
                },
                {
                  label: 'Ações',
                  render: (a) => (
                    <Button
                      variant="ghost"
                      data-testid="bo-sub-open"
                      onClick={() => setAberto(a.estabelecimentoId)}
                    >
                      Gerenciar
                    </Button>
                  ),
                },
              ]}
            />
            <Pagination
              page={pagina}
              size={lista.data.pageSize}
              total={lista.data.total}
              onChange={setPagina}
              busy={lista.isFetching}
            />
          </>
        )}
      </section>
      {aberto !== null && <SubscriberModal id={aberto} onClose={() => setAberto(null)} />}
    </>
  );
}


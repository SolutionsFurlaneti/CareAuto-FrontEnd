import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { DataTable } from '../../components/DataTable';
import { describeError } from '../../lib/describeError';
import { dateTime } from '../../lib/format';
import { confirmAction } from '../../lib/swal';
import { Button, EmptyState, Modal, Skeleton, StatusBadge, Switch } from '../../ui';
import {
  deactivatePrinter,
  generateAgentToken,
  savePrinter,
  savePrintConfig,
  testPrinter,
  type ConfiguracaoImpressao,
  type Impressora,
  type ImpressoraInput,
  type TrabalhoImpressao,
} from './api';
import { printKeys, usePrintConfig, usePrintJobs, usePrinters, usePrintScope } from './hooks';
import { PrinterForm } from './PrinterForm';

const jobStatus: Record<TrabalhoImpressao['status'], { badge: string; label: string }> = {
  PENDENTE: { badge: 'PENDENTE', label: 'Na fila' },
  IMPRIMINDO: { badge: 'EM_EXECUCAO', label: 'Imprimindo' },
  IMPRESSO: { badge: 'PAGO', label: 'Impresso' },
  FALHOU: { badge: 'ERRO', label: 'Falhou' },
};
function PreferencesPanel({ config }: { config: ConfiguracaoImpressao }) {
  const cache = useQueryClient();
  const scope = usePrintScope();
  const [ask, setAsk] = useState(config.perguntarAoSalvarEntrada);
  const [automatic, setAutomatic] = useState(config.imprimirCupomEntradaAutomatico);
  useEffect(() => {
    setAsk(config.perguntarAoSalvarEntrada);
    setAutomatic(config.imprimirCupomEntradaAutomatico);
  }, [config.versao, config.perguntarAoSalvarEntrada, config.imprimirCupomEntradaAutomatico]);
  const save = useMutation({
    mutationFn: () =>
      savePrintConfig({
        perguntarAoSalvarEntrada: ask,
        imprimirCupomEntradaAutomatico: automatic,
        versao: config.versao,
      }),
    onSuccess: (data) => {
      cache.setQueryData(printKeys.config(scope), data);
      toast.success('Preferências de impressão salvas.');
    },
  });
  const dirty =
    ask !== config.perguntarAoSalvarEntrada || automatic !== config.imprimirCupomEntradaAutomatico;
  const summary = ask
    ? 'Ao registrar uma entrada, o operador escolhe se imprime o ticket.'
    : automatic
      ? 'O ticket é impresso automaticamente em toda entrada.'
      : 'Nenhum ticket é impresso na entrada. O operador ainda pode imprimir pela estadia.';
  return (
    <section className="panel" aria-labelledby="print-preferences" data-testid="print-preferences">
      <div className="panel-toolbar">
        <h2 id="print-preferences">Ao registrar entrada</h2>
      </div>
      <div className="integration-body">
        <div className="switch-group">
          <Switch
            label="Perguntar se deseja imprimir na entrada"
            description="Mostra “Deseja imprimir o ticket de estacionamento?” depois de salvar."
            data-testid="field-perguntarAoSalvarEntrada"
            checked={ask}
            onChange={setAsk}
          />
          <Switch
            label="Imprimir automaticamente"
            description={
              ask
                ? 'Desative a pergunta para imprimir sem confirmação.'
                : 'Imprime o ticket sem perguntar.'
            }
            data-testid="field-imprimirCupomEntradaAutomatico"
            checked={!ask && automatic}
            disabled={ask}
            onChange={setAutomatic}
          />
        </div>
        <p className="muted" role="status">
          {summary}
        </p>
        {!!save.error && (
          <p role="alert" className="form-error">
            {describeError(save.error)}
          </p>
        )}
        <div className="integration-actions">
          <Button
            data-testid="print-preferences-save"
            busy={save.isPending}
            disabled={!dirty}
            onClick={() => save.mutate()}
          >
            Salvar preferências
          </Button>
          {config.atualizadoEm && <small>Última alteração: {dateTime(config.atualizadoEm)}</small>}
        </div>
      </div>
    </section>
  );
}

function AgentPanel({ config }: { config: ConfiguracaoImpressao }) {
  const cache = useQueryClient();
  const scope = usePrintScope();
  const [token, setToken] = useState<string>();
  const generate = useMutation({
    mutationFn: generateAgentToken,
    onSuccess: (data) => {
      setToken(data.token);
      void cache.invalidateQueries({ queryKey: printKeys.config(scope) });
    },
    onError: (e) => toast.error(describeError(e)),
  });
  const online = config.agenteConectado;
  async function start() {
    if (
      config.possuiTokenAgente &&
      !(await confirmAction(
        'Gerar novo token?',
        'O agente instalado na guarita deixará de imprimir até receber o novo token.',
        'Gerar novo token',
      ))
    )
      return;
    generate.mutate();
  }
  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      toast.success('Token copiado.');
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  }
  return (
    <section className="panel" aria-labelledby="print-agent" data-testid="print-agent">
      <div className="panel-toolbar">
        <h2 id="print-agent">Agente de impressão</h2>
        {!config.possuiTokenAgente ? (
          <StatusBadge status="ENCERRADA" label="Não configurado" />
        ) : online ? (
          <StatusBadge status="ATIVA" label="Conectado" />
        ) : (
          <StatusBadge status="PENDENTE" label="Sem contato" />
        )}
      </div>
      <div className="integration-body">
        <p>
          O navegador não acessa impressoras USB nem a porta 9100. Um pequeno serviço instalado no
          computador da guarita busca os tickets na fila e imprime.
        </p>
        <p className="muted">
          {config.possuiTokenAgente
            ? config.ultimoContatoAgenteEm
              ? `Último contato: ${dateTime(config.ultimoContatoAgenteEm)}.`
              : 'O agente ainda não se conectou com o token atual.'
            : 'Gere um token e configure-o no agente local de impressão. Consulte o guia de instalação do agente.'}
        </p>
        <div className="integration-actions">
          <Button
            variant={config.possuiTokenAgente ? 'secondary' : 'primary'}
            busy={generate.isPending}
            data-testid="agent-token"
            onClick={() => void start()}
          >
            {config.possuiTokenAgente ? 'Gerar novo token' : 'Gerar token do agente'}
          </Button>
        </div>
      </div>
      <Modal
        open={!!token}
        onClose={() => setToken(undefined)}
        title="Token do agente"
        actions={
          <>
            <Button variant="secondary" onClick={() => void copy()}>
              <Copy size={16} aria-hidden="true" /> Copiar
            </Button>
            <Button data-testid="agent-token-done" onClick={() => setToken(undefined)}>
              Já copiei
            </Button>
          </>
        }
      >
        <p role="alert" className="notice">
          Este token aparece uma única vez. Guarde-o agora: depois de fechar, só é possível gerar
          outro.
        </p>
        <code className="agent-token" data-testid="agent-token-value">
          {token}
        </code>
        <p className="muted">No computador da guarita, em um PowerShell como administrador:</p>
        <code className="agent-token">
          [Environment]::SetEnvironmentVariable("Agente__Token", "{token}", "Machine")
        </code>
        <p className="muted">Depois reinicie o serviço local de impressão no Windows.</p>
      </Modal>
    </section>
  );
}

function PrintersPanel({ agentReady }: { agentReady: boolean }) {
  const cache = useQueryClient();
  const scope = usePrintScope();
  const printers = usePrinters();
  const [editing, setEditing] = useState<Impressora | 'new'>();
  const refresh = () => void cache.invalidateQueries({ queryKey: printKeys.all(scope) });
  const save = useMutation({
    mutationFn: ({ data, id }: { data: ImpressoraInput; id?: number }) => savePrinter(data, id),
    onSuccess: () => {
      refresh();
      setEditing(undefined);
      toast.success('Impressora salva.');
    },
  });
  const deactivate = useMutation({
    mutationFn: deactivatePrinter,
    onSuccess: () => {
      refresh();
      toast.success('Impressora desativada.');
    },
    onError: (e) => toast.error(describeError(e)),
  });
  const test = useMutation({
    mutationFn: testPrinter,
    onSuccess: () => {
      refresh();
      toast.success('Página de teste enviada. Acompanhe em Últimas impressões.');
    },
    onError: (e) => toast.error(describeError(e)),
  });
  const rows = printers.data ?? [];
  return (
    <section className="panel" aria-labelledby="print-printers" data-testid="print-printers">
      <div className="panel-toolbar">
        <h2 id="print-printers">Impressoras</h2>
        <Button
          data-testid="printer-new"
          onClick={() => {
            save.reset();
            setEditing('new');
          }}
        >
          <Plus size={16} aria-hidden="true" /> Nova impressora
        </Button>
      </div>
      {printers.isPending ? (
        <Skeleton />
      ) : printers.isError ? (
        <QueryError
          error={printers.error}
          what="as impressoras"
          onRetry={() => void printers.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nenhuma impressora cadastrada"
          description="Cadastre a impressora da guarita para imprimir tickets com QR Code."
        />
      ) : (
        <DataTable
          testId="printers-table"
          caption="Impressoras cadastradas"
          rows={rows}
          rowKey={(p) => p.impressoraId}
          columns={[
            { label: 'Nome', render: (p) => <strong>{p.nome}</strong> },
            {
              label: 'Conexão',
              render: (p) =>
                p.tipoConexao === 'REDE_TCP'
                  ? `Rede · ${p.enderecoDriverOuIp}:${p.portaTcp}`
                  : `USB · ${p.enderecoDriverOuIp}`,
            },
            {
              label: 'Função',
              render: (p) =>
                [p.imprimeEntrada && 'Entrada', p.imprimeFechamento && 'Fechamento']
                  .filter(Boolean)
                  .join(' e '),
            },
            {
              label: 'Situação',
              render: (p) => (
                <StatusBadge
                  status={p.ativo ? 'ATIVA' : 'ENCERRADA'}
                  label={p.ativo ? 'Ativa' : 'Inativa'}
                />
              ),
            },
            {
              label: 'Ações',
              render: (p) => (
                <div className="row-actions">
                  <Button
                    variant="ghost"
                    data-testid="printer-edit"
                    onClick={() => {
                      save.reset();
                      setEditing(p);
                    }}
                  >
                    Editar
                  </Button>
                  {p.ativo && (
                    <>
                      <Button
                        variant="ghost"
                        data-testid="printer-test"
                        disabled={!agentReady}
                        title={agentReady ? undefined : 'Gere o token do agente primeiro.'}
                        busy={test.isPending && test.variables === p.impressoraId}
                        onClick={() => test.mutate(p.impressoraId)}
                      >
                        Imprimir teste
                      </Button>
                      <Button
                        variant="ghost"
                        data-testid="printer-deactivate"
                        onClick={async () => {
                          if (
                            await confirmAction(
                              'Desativar impressora?',
                              `${p.nome} deixará de receber tickets. Você pode reativá-la em Editar.`,
                              'Desativar',
                            )
                          )
                            deactivate.mutate(p.impressoraId);
                        }}
                      >
                        Desativar
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
      <Modal
        open={!!editing}
        onClose={() => setEditing(undefined)}
        title={editing === 'new' ? 'Nova impressora' : 'Editar impressora'}
        busy={save.isPending}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={save.isPending}
              onClick={() => setEditing(undefined)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="printer-form"
              data-testid="form-submit"
              busy={save.isPending}
            >
              Salvar impressora
            </Button>
          </>
        }
      >
        {editing && (
          <PrinterForm
            key={editing === 'new' ? 'new' : editing.impressoraId}
            formId="printer-form"
            printer={editing === 'new' ? undefined : editing}
            error={save.error}
            onSubmit={async (data) => {
              try {
                await save.mutateAsync({
                  data,
                  id: editing === 'new' ? undefined : editing.impressoraId,
                });
              } catch {
                /* Error stays visible in the form. */
              }
            }}
          />
        )}
      </Modal>
    </section>
  );
}

function JobsPanel() {
  const jobs = usePrintJobs();
  return (
    <section className="panel" aria-labelledby="print-jobs" data-testid="print-jobs">
      <div className="panel-toolbar">
        <h2 id="print-jobs">Últimas impressões</h2>
        <Button
          variant="ghost"
          aria-label="Atualizar impressões"
          busy={jobs.isFetching}
          onClick={() => void jobs.refetch()}
        >
          <RefreshCw size={16} aria-hidden="true" />
        </Button>
      </div>
      {jobs.isPending ? (
        <Skeleton />
      ) : jobs.isError ? (
        <QueryError error={jobs.error} what="as impressões" onRetry={() => void jobs.refetch()} />
      ) : jobs.data.length === 0 ? (
        <EmptyState
          title="Nenhuma impressão ainda"
          description="Tickets e testes enviados aparecem aqui."
        />
      ) : (
        <DataTable
          testId="print-jobs-table"
          caption="Últimas 20 impressões"
          rows={jobs.data}
          rowKey={(j) => j.impressaoId}
          columns={[
            { label: 'Quando', render: (j) => dateTime(j.criadoEm) },
            { label: 'Impressora', render: (j) => j.impressora },
            {
              label: 'Tipo',
              render: (j) => (j.tipo === 'TESTE' ? 'Teste' : `Ticket · estadia #${j.estadiaId}`),
            },
            {
              label: 'Situação',
              render: (j) => (
                <StatusBadge status={jobStatus[j.status].badge} label={jobStatus[j.status].label} />
              ),
            },
            {
              label: 'Detalhe',
              render: (j) => j.erro ?? (j.tentativas > 1 ? `${j.tentativas} tentativas` : '—'),
            },
          ]}
        />
      )}
    </section>
  );
}

export function PrintingPage() {
  // Atualiza a situação do agente enquanto a tela está aberta.
  const config = usePrintConfig(true, 15000);
  return (
    <>
      <PageHeader
        eyebrow="CONFIGURAÇÕES"
        title="Impressão"
        description="Tickets de entrada com QR Code em impressoras térmicas USB ou de rede."
      />
      {config.isPending ? (
        <Skeleton />
      ) : config.isError ? (
        <QueryError
          error={config.error}
          what="a configuração de impressão"
          onRetry={() => void config.refetch()}
        />
      ) : (
        <div className="printing-grid">
          <PreferencesPanel config={config.data} />
          <AgentPanel config={config.data} />
          <PrintersPanel agentReady={config.data.possuiTokenAgente} />
          <JobsPanel />
        </div>
      )}
    </>
  );
}



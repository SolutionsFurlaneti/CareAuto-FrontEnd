import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { Copy, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { DataTable } from '../../components/DataTable';
import { describeError } from '../../lib/describeError';
import { API_BASE_URL } from '../../lib/apiClient';
import { dateTime } from '../../lib/format';
import { alertAction, confirmAction } from '../../lib/swal';
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
import { nativePrintAgent, type NativeAgentStatus } from './nativePrintAgent';

const jobStatus: Record<TrabalhoImpressao['status'], { badge: string; label: string }> = {
  PENDENTE: { badge: 'PENDENTE', label: 'Na fila' },
  IMPRIMINDO: { badge: 'EM_EXECUCAO', label: 'Imprimindo' },
  IMPRESSO: { badge: 'PAGO', label: 'Impresso' },
  FALHOU: { badge: 'ERRO', label: 'Falhou' },
};
function PreferencesPanel({ config }: { config: ConfiguracaoImpressao }) {
  const cache = useQueryClient();
  const scope = usePrintScope();
  const printers = usePrinters();
  const hasEntryPrinter =
    printers.data?.some((printer) => printer.ativo && printer.imprimeEntrada) ?? false;
  const [ask, setAsk] = useState(config.perguntarAoSalvarEntrada);
  const [automatic, setAutomatic] = useState(config.imprimirCupomEntradaAutomatico);
  useEffect(() => {
    setAsk(config.perguntarAoSalvarEntrada);
    setAutomatic(config.imprimirCupomEntradaAutomatico);
  }, [config.versao, config.perguntarAoSalvarEntrada, config.imprimirCupomEntradaAutomatico]);
  const effectiveAsk = hasEntryPrinter && ask;
  const effectiveAutomatic = hasEntryPrinter && !effectiveAsk && automatic;
  const save = useMutation({
    mutationFn: () =>
      savePrintConfig({
        perguntarAoSalvarEntrada: effectiveAsk,
        imprimirCupomEntradaAutomatico: effectiveAutomatic,
        versao: config.versao,
      }),
    onSuccess: (data) => {
      cache.setQueryData(printKeys.config(scope), data);
      toast.success('Preferências de impressão salvas.');
    },
  });
  const dirty =
    effectiveAsk !== config.perguntarAoSalvarEntrada ||
    effectiveAutomatic !== config.imprimirCupomEntradaAutomatico;
  const summary = effectiveAsk
    ? 'Ao registrar uma entrada, o operador escolhe se imprime o ticket.'
    : effectiveAutomatic
      ? 'O ticket é impresso automaticamente em toda entrada.'
      : 'Nenhum ticket é impresso na entrada. O operador ainda pode imprimir pela estadia.';
  const blockedMessage = 'Cadastre e ative uma impressora para habilitar esta opção.';
  return (
    <section className="panel" aria-labelledby="print-preferences" data-testid="print-preferences">
      <div className="panel-toolbar">
        <h2 id="print-preferences">Ao registrar entrada</h2>
      </div>
      <div className="integration-body">
        <div className="switch-group">
          <Switch
            label="Perguntar se deseja imprimir na entrada"
            description={
              hasEntryPrinter
                ? config.possuiTokenAgente
                  ? 'Mostra “Deseja imprimir o ticket de estacionamento?” depois de salvar.'
                  : 'Gere o token e instale o agente de impressão para enviar os tickets.'
                : 'Cadastre e ative uma impressora térmica para habilitar esta opção.'
            }
            data-testid="field-perguntarAoSalvarEntrada"
            checked={effectiveAsk}
            onChange={(enabled) => {
              if (enabled && !hasEntryPrinter) {
                void alertAction('Impressora necessária', blockedMessage);
                return;
              }
              setAsk(enabled);
              if (enabled) setAutomatic(false);
            }}
          />
          <Switch
            label="Imprimir automaticamente"
            description={
              !hasEntryPrinter
                ? 'Cadastre e ative uma impressora térmica para habilitar esta opção.'
                : effectiveAsk
                  ? 'Desative a pergunta para imprimir sem confirmação.'
                  : config.possuiTokenAgente
                    ? 'Imprime o ticket sem perguntar.'
                    : 'Gere o token e instale o agente de impressão para enviar os tickets.'
            }
            data-testid="field-imprimirCupomEntradaAutomatico"
            checked={effectiveAutomatic}
            disabled={effectiveAsk}
            onChange={(enabled) => {
              if (enabled && !hasEntryPrinter) {
                void alertAction('Impressora necessária', blockedMessage);
                return;
              }
              setAutomatic(enabled);
              if (enabled) setAsk(false);
            }}
          />
        </div>
        <p className="muted" role="status">
          {summary}
        </p>
        {hasEntryPrinter && !config.possuiTokenAgente && (
          <p className="notice" role="status">
            A impressora está cadastrada. Para os tickets chegarem até ela, gere o token do agente e
            instale o agente no computador da guarita.
          </p>
        )}
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
  const nativePlatform = Capacitor.isNativePlatform();
  const [token, setToken] = useState<string>();
  const [nativeStatus, setNativeStatus] = useState<NativeAgentStatus>();
  useEffect(() => {
    if (!nativePlatform) return;
    void nativePrintAgent
      .getStatus()
      .then(setNativeStatus)
      .catch(() => setNativeStatus(undefined));
  }, [nativePlatform]);
  const generate = useMutation({
    mutationFn: generateAgentToken,
    onSuccess: async (data) => {
      setToken(data.token);
      if (nativePlatform) {
        try {
          const status = await nativePrintAgent.start({
            apiUrl: API_BASE_URL || 'https://www.furlaneti.com.br/autocare-api',
            token: data.token,
          });
          setNativeStatus(status);
          toast.success('Agente de impressão SUNMI iniciado neste terminal.');
        } catch (e) {
          toast.error(describeError(e));
        }
      }
      void cache.invalidateQueries({ queryKey: printKeys.config(scope) });
    },
    onError: (e) => toast.error(describeError(e)),
  });
  const online = config.agenteConectado;
  async function start() {
    if (nativePlatform && !nativeStatus?.supported) {
      toast.error('Este terminal não foi identificado como compatível com a impressora SUNMI.');
      return;
    }
    if (
      config.possuiTokenAgente &&
      !(await confirmAction(
        'Gerar novo token?',
        'Todos os agentes deste estabelecimento deixarão de imprimir até receberem o novo token.',
        'Gerar novo token',
      ))
    )
      return;
    generate.mutate();
  }
  async function copyToken() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      toast.success('Token copiado.');
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  }
  async function copyDeviceId() {
    if (!nativeStatus?.deviceId) return;
    try {
      await navigator.clipboard.writeText(nativeStatus.deviceId);
      toast.success('ID do POS copiado.');
    } catch {
      toast.error('Não foi possível copiar o ID. Selecione o texto e copie manualmente.');
    }
  }
  async function stop() {
    try {
      await nativePrintAgent.stop();
      setNativeStatus((current) => current ? { ...current, running: false } : current);
      toast.success('Agente de impressão pausado neste terminal.');
    } catch (e) {
      toast.error(describeError(e));
    }
  }
  return (
    <section className="panel" aria-labelledby="print-agent" data-testid="print-agent">
      <div className="panel-toolbar">
        <h2 id="print-agent">{nativePlatform ? 'Agente Android' : 'Agente de impressão'}</h2>
        {!config.possuiTokenAgente ? (
          <StatusBadge status="ENCERRADA" label="Não configurado" />
        ) : online ? (
          <StatusBadge status="ATIVA" label="Conectado" />
        ) : nativePlatform && nativeStatus?.running ? (
          <StatusBadge status="PENDENTE" label="Ativo no terminal" />
        ) : (
          <StatusBadge status="PENDENTE" label="Sem contato" />
        )}
      </div>
      <div className="integration-body">
        {nativePlatform ? (
          <>
            <p>
              O agente SUNMI consulta a fila em segundo plano e envia tickets com QR Code à impressora
              térmica integrada. Compatibilidade automática é habilitada para terminais SUNMI.
            </p>
            <p className="muted">
              Modelo detectado: {nativeStatus?.model || 'consultando terminal'}
              {nativeStatus && !nativeStatus.supported
                ? ' · Este fabricante ainda não possui adaptador nativo de impressão nesta versão.'
                : ''}
            </p>
            <div className="integration-actions">
              <code className="agent-token">{nativeStatus?.deviceId || 'ID do POS indisponível'}</code>
              <Button variant="secondary" disabled={!nativeStatus?.deviceId} onClick={() => void copyDeviceId()}>
                <Copy size={16} aria-hidden="true" /> Copiar ID do POS
              </Button>
            </div>
          </>
        ) : (
          <>
            <p>
              O navegador não acessa impressoras USB nem a porta 9100. Um pequeno serviço instalado no
              computador da guarita busca os tickets na fila e imprime.
            </p>
            <p className="muted">
              {config.possuiTokenAgente
                ? config.ultimoContatoAgenteEm
                  ? 'Último contato: ' + dateTime(config.ultimoContatoAgenteEm) + '.'
                  : 'O agente ainda não se conectou com o token atual.'
                : 'Gere um token e configure-o no agente local de impressão. Consulte o guia de instalação do agente.'}
            </p>
          </>
        )}
        <div className="integration-actions">
          <Button
            variant={config.possuiTokenAgente ? 'secondary' : 'primary'}
            busy={generate.isPending}
            disabled={nativePlatform && !nativeStatus?.supported}
            data-testid="agent-token"
            onClick={() => void start()}
          >
            {nativePlatform
              ? nativeStatus?.running
                ? 'Reiniciar agente e token'
                : 'Ativar agente neste POS'
              : config.possuiTokenAgente
                ? 'Gerar novo token'
                : 'Gerar token do agente'}
          </Button>
          {nativePlatform && nativeStatus?.running && (
            <Button variant="ghost" disabled={generate.isPending} onClick={() => void stop()}>
              Pausar agente neste POS
            </Button>
          )}
          {!nativePlatform && config.ultimoContatoAgenteEm && (
            <small>Último contato: {dateTime(config.ultimoContatoAgenteEm)}</small>
          )}
        </div>
      </div>
      <Modal
        open={!!token}
        onClose={() => setToken(undefined)}
        title="Token do agente"
        actions={
          <>
            <Button variant="secondary" onClick={() => void copyToken()}>
              <Copy size={16} aria-hidden="true" /> Copiar
            </Button>
            <Button data-testid="agent-token-done" onClick={() => setToken(undefined)}>
              Já copiei
            </Button>
          </>
        }
      >
        <p role="alert" className="notice">
          Este token aparece uma única vez. Guarde-o agora: depois de fechar, só é possível gerar outro.
        </p>
        <code className="agent-token" data-testid="agent-token-value">
          {token}
        </code>
        {nativePlatform ? (
          <>
            <p className="muted">
              {nativeStatus?.running
                ? 'O serviço nativo está ativo. O token fica protegido pelo Android Keystore neste terminal.'
                : 'O token foi gerado, mas o agente não iniciou. Você pode copiá-lo e tentar novamente após verificar a compatibilidade do terminal.'}
            </p>
            <p className="muted">ID deste POS: {nativeStatus?.deviceId || 'indisponível'}</p>
          </>
        ) : (
          <>
            <p className="muted">No computador da guarita, em um PowerShell como administrador:</p>
            <code className="agent-token">
              [Environment]::SetEnvironmentVariable("Agente__Token", "{token}", "Machine")
            </code>
            <p className="muted">Depois reinicie o serviço local de impressão no Windows.</p>
          </>
        )}
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
                ? "Rede · " + p.enderecoDriverOuIp + ":" + p.portaTcp
                : p.tipoConexao === 'ANDROID_POS'
                  ? "POS Android · " + p.enderecoDriverOuIp
                  : "USB · " + p.enderecoDriverOuIp,
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
        description="Tickets de entrada com QR Code em impressoras USB, de rede ou integradas a POS Android."
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



import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStay, useStayServices } from './hooks';
import { useCommand } from '../shared/hooks';
import { Button, Modal, Skeleton, StatusBadge } from '../../ui';
import { QueryError } from '../../components/QueryError';
import { RecordForm } from '../../components/RecordForm';
import { ReferenceLabel } from '../../components/ReferenceLabel';
import { dateTime, money } from '../../lib/format';
import { label } from '../../lib/labels';
import { stayServiceSchema } from './staySchema';
import { useAuthStore } from '../../stores/authStore';
import { usePrintConfig, usePrintTicket } from '../printing/hooks';
import { useChecklist } from '../checklist/hooks';
import { ChecklistModal } from '../checklist/ChecklistModal';
const calcDuration = (entrada: string, saida?: string | null) => {
  const start = new Date(entrada).getTime();
  const end = saida ? new Date(saida).getTime() : Date.now();
  const diffMinutes = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
};

export function StayDetails({ id, onClose }: { id: number; onClose: () => void }) {
  const stay = useStay(id);
  const services = useStayServices(id);
  const mutation = useCommand('estadias');
  const [intent, setIntent] = useState<'exit' | 'cancel' | null>(null);
  const roles = useAuthStore((s) => s.session?.roles || []);
  const print = usePrintTicket();
  const printing = usePrintConfig();
  const checklist = useChecklist(id);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const row = stay.data;
  return (
    <Modal
      open
      onClose={onClose}
      title={'Estadia #' + id}
      busy={mutation.isPending}
      actions={
        row?.status === 'EM_ANDAMENTO' ? (
          intent ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setIntent(null)}
                disabled={mutation.isPending}
                data-testid="stay-back"
              >
                Voltar
              </Button>
              <Button
                variant={intent === 'cancel' ? 'danger' : 'primary'}
                busy={mutation.isPending}
                data-testid="stay-confirm"
                onClick={() =>
                  mutation.mutate(
                    { action: id + (intent === 'exit' ? '/saida' : '/cancelamento') },
                    { onSuccess: () => setIntent(null) },
                  )
                }
              >
                Confirmar {intent === 'exit' ? 'saída' : 'cancelamento'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" data-testid="stay-cancel" onClick={() => setIntent('cancel')}>
                Cancelar estadia
              </Button>
              {printing.data?.impressaoEntradaDisponivel && (
                <Button
                  variant="secondary"
                  data-testid="stay-print-ticket"
                  busy={print.isPending}
                  onClick={() => print.mutate(id)}
                >
                  Imprimir ticket
                </Button>
              )}
              <Button data-testid="stay-exit" onClick={() => setIntent('exit')}>
                Registrar saída
              </Button>
            </>
          )
        ) : (
          <Button variant="secondary" data-testid="stay-close" onClick={onClose}>
            Fechar
          </Button>
        )
      }
    >
      {stay.isPending ? (
        <Skeleton />
      ) : stay.isError ? (
        <QueryError error={stay.error} what="a estadia" onRetry={() => void stay.refetch()} />
      ) : (
        row && (
          <>
            <div className="detail-heading">
              <span className="plate">
                <ReferenceLabel
                  id={row.veiculoId}
                  resource="veiculos"
                  idField="veiculoId"
                  labelField="placa"
                />
              </span>
              <StatusBadge status={row.status} label={label(row.status)} />
            </div>
            <dl className="detail-grid">
              <div>
                <dt>Entrada</dt>
                <dd>{dateTime(row.dataEntrada)}</dd>
              </div>
              <div>
                <dt>Permanência</dt>
                <dd style={{ fontWeight: 650, color: row.status === 'EM_ANDAMENTO' ? 'var(--ok)' : 'var(--ink)' }}>
                  {calcDuration(row.dataEntrada, row.dataSaida)}
                </dd>
              </div>
              <div>
                <dt>Estacionamento</dt>
                <dd>{money(row.valorEstacionamento)}</dd>
              </div>
              <div>
                <dt>Serviços</dt>
                <dd>{money(row.valorServicos)}</dd>
              </div>
            </dl>
            {row.observacao && <p className="detail-note">{row.observacao}</p>}
            <div className="checklist-summary" data-testid="stay-checklist-summary">
              <div>
                <strong>Checklist veicular</strong>
                <small>
                  {checklist.isPending
                    ? 'Carregando…'
                    : checklist.isError
                      ? 'Não foi possível carregar.'
                      : checklist.data.checkList
                        ? `Realizado por ${checklist.data.checkList.atendente} · ${dateTime(checklist.data.checkList.atualizadoEm)} · ${checklist.data.checkList.avarias.length} avaria(s)`
                        : row.status === 'EM_ANDAMENTO'
                          ? 'Pendente. Pode ser feito agora ou durante a estadia.'
                          : 'Não realizado.'}
                </small>
              </div>
              {checklist.data && (checklist.data.checkList || checklist.data.editavel) && (
                <Button
                  variant="secondary"
                  data-testid="stay-checklist"
                  onClick={() => setChecklistOpen(true)}
                >
                  {checklist.data.checkList ? 'Ver checklist' : 'Realizar checklist'}
                </Button>
              )}
            </div>
            {checklistOpen && (
              <ChecklistModal estadiaId={id} onClose={() => setChecklistOpen(false)} />
            )}
            {intent && (
              <p className="notice" role="status">
                {intent === 'exit'
                  ? 'A saída será registrada agora e o servidor calculará o valor da estadia. Todos os serviços precisam estar finalizados.'
                  : 'O histórico será preservado. Serviços iniciados e pagamentos impedem o cancelamento.'}
              </p>
            )}
            <div className="section-label">
              <h3>Serviços da estadia</h3>
            </div>
            {services.isPending ? (
              <Skeleton />
            ) : services.isError ? (
              <QueryError
                error={services.error}
                what="os serviços"
                onRetry={() => void services.refetch()}
              />
            ) : !services.data.length ? (
              <p className="muted">Nenhum serviço adicionado.</p>
            ) : (
              services.data.map((s) => (
                <div className="service-line" key={s.estadiaServicoId}>
                  <div>
                    <strong>
                      <ReferenceLabel
                        id={s.servicoId}
                        resource="servicos"
                        idField="servicoId"
                        labelField="nome"
                      />
                    </strong>
                    <small>
                      {money(s.valorCobrado)} · {label(s.status)}
                    </small>
                  </div>
                  {row.status === 'EM_ANDAMENTO' && s.status !== 'FINALIZADO' && (
                    <Button
                      variant="secondary"
                      busy={mutation.isPending}
                      data-testid="service-advance"
                      onClick={() =>
                        mutation.mutate({
                          action: id + '/servicos/' + s.estadiaServicoId + '/status',
                          method: 'PATCH',
                          data: { status: s.status === 'PENDENTE' ? 'EM_EXECUCAO' : 'FINALIZADO' },
                        })
                      }
                    >
                      {s.status === 'PENDENTE' ? 'Iniciar' : 'Finalizar'}
                    </Button>
                  )}
                </div>
              ))
            )}
            {row.status === 'EM_ANDAMENTO' && !intent && (
              <div className="inset-form">
                <h3>Adicionar um cuidado</h3>
                <RecordForm
                  spec={{
                    schema: stayServiceSchema,
                    defaults: { servicoId: 0 },
                    fields: [
                      {
                        name: 'servicoId',
                        label: 'Serviço',
                        lookup: { resource: 'servicos', id: 'servicoId', label: 'nome' },
                      },
                    ],
                  }}
                  onSubmit={async (v) => {
                    await mutation
                      .mutateAsync({ action: id + '/servicos', data: v })
                      .catch(() => undefined);
                  }}
                  error={mutation.error}
                />
              </div>
            )}
            {mutation.error && intent && (
              <QueryError
                error={mutation.error}
                what="a operação"
                onRetry={() => mutation.reset()}
              />
            )}
            {row.valorTotal !== null && (
              <div className="total-line">
                <span>Total da estadia</span>
                <strong>{money(row.valorTotal)}</strong>
              </div>
            )}
            {row.status === 'CONCLUIDO' && roles.includes('Admin') && (
              <Link className="text-link" to={'/pagamentos?estadia=' + id} onClick={onClose}>
                Ir para pagamentos →
              </Link>
            )}
          </>
        )
      )}
    </Modal>
  );
}

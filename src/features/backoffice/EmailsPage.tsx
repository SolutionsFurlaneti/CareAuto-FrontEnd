import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { DataTable } from '../../components/DataTable';
import { Button, Field, SelectField, Skeleton } from '../../ui';
import { getEmails, enfileirarEmails, type EmailRecipient } from './api';
import { useBackofficeAction, useBackofficeScope, backofficeKeys } from './hooks';

const statusLabel = (status: string | null) =>
  ({
    PENDENTE: 'Na fila',
    ENVIANDO: 'Enviando',
    ACEITO: 'Aceito pelo provedor',
    INCERTO: 'Incerto — conferir no provedor',
    FALHA: 'Falha — conferir no provedor',
  })[status ?? ''] ?? 'Não enfileirado';
export function BackofficeEmailsPage() {
  const scope = useBackofficeScope();
  const query = useQuery({
    queryKey: [...backofficeKeys.all(scope), 'emails'],
    queryFn: ({ signal }) => getEmails(signal),
    enabled: !!scope,
    refetchInterval: 15000,
  });
  const [modelo, setModelo] = useState('BOAS_VINDAS');
  const [busca, setBusca] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [confirm, setConfirm] = useState(false);
  const action = useBackofficeAction(
    enfileirarEmails,
    (r) =>
      `${r.enfileirados} mensagem(ns) enfileirada(s); ${r.ignorados} estabelecimento(s) ignorado(s) por já existir envio ou faltar destinatário.`,
  );
  const data = query.data;
  const template = data?.modelos.find((x) => x.id === modelo);
  const eligible = (r: EmailRecipient) => {
    const welcome = !r.boasVindasStatus;
    const asaas = !r.orientacaoAsaasStatus || r.orientacaoAsaasStatus === 'PENDENTE';
    return (
      !!r.email &&
      (modelo === 'BOAS_VINDAS'
        ? welcome
        : modelo === 'ORIENTACAO_ASAAS'
          ? asaas
          : welcome || asaas)
    );
  };
  const rows = (data?.destinatarios ?? []).filter((r) =>
    `${r.nome} ${r.email ?? ''}`.toLowerCase().includes(busca.toLowerCase()),
  );
  const ids = selected.filter((id) =>
    data?.destinatarios.some((r) => r.estabelecimentoId === id && eligible(r)),
  );
  return (
    <>
      <PageHeader
        eyebrow="RELACIONAMENTO"
        title="E-mails"
        description="Envie orientações aos administradores dos estabelecimentos cadastrados."
      />
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <QueryError what="os e-mails" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {!data?.habilitado && (
            <p role="alert" className="notice">
              Envio desativado. Configure EmailBlast__Habilitado=true e EmailBlast__SystemId=7 no
              servidor.
            </p>
          )}
          <section className="panel" style={{ padding: 24 }}>
            <SelectField
              label="Template de e-mail"
              data-testid="bo-email-template"
              value={modelo}
              disabled={action.isPending}
              onChange={(e) => {
                setModelo(e.target.value);
                setSelected([]);
                setConfirm(false);
              }}
            >
              {data?.modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </SelectField>
            <p>
              <strong>Assunto:</strong> {template?.assunto}
            </p>
            <details>
              <summary>Visualizar template</summary>
              <p>Exemplo ilustrativo. O envio usa nome e dados do cadastro.</p>
              <iframe
                title="Prévia do e-mail"
                sandbox=""
                srcDoc={template?.html}
                style={{ width: '100%', height: 500, border: 0 }}
              />
            </details>
          </section>
          <p className="notice">
            Escolha somente boas-vindas, somente integração Asaas ou os dois. O disparo manual entra
            na próxima execução da fila, sem aguardar 30 minutos. Mensagens aceitas ou incertas não
            são repetidas. Aceite pelo provedor não confirma entrega.
          </p>
          <Field
            label="Buscar estabelecimento ou e-mail"
            value={busca}
            data-testid="bo-email-search"
            onChange={(e) => {
              setBusca(e.target.value);
              setSelected([]);
              setConfirm(false);
            }}
          />
          <div className="bo-actions">
            <Button
              variant="secondary"
              disabled={action.isPending}
              data-testid="bo-email-all"
              onClick={() => {
                setSelected(
                  rows
                    .filter(eligible)
                    .slice(0, 1000)
                    .map((r) => r.estabelecimentoId),
                );
                setConfirm(false);
              }}
            >
              Selecionar todos elegíveis da lista
            </Button>
            <Button
              variant="ghost"
              disabled={action.isPending}
              onClick={() => {
                setSelected([]);
                setConfirm(false);
              }}
            >
              Limpar seleção
            </Button>
            <span>{ids.length} selecionado(s). Limite: 1.000 por lote.</span>
          </div>
          <DataTable
            rows={rows}
            rowKey={(r) => r.estabelecimentoId}
            testId="bo-email-recipients"
            caption="Destinatários dos e-mails"
            columns={[
              {
                label: 'Selecionar',
                render: (r) => (
                  <label
                    style={{
                      display: 'inline-flex',
                      minWidth: 48,
                      minHeight: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{ width: 20, height: 20 }}
                      aria-label={`Selecionar ${r.nome}`}
                      data-testid={`bo-email-select-${r.estabelecimentoId}`}
                      disabled={!eligible(r) || action.isPending}
                      checked={ids.includes(r.estabelecimentoId)}
                      onChange={(e) => {
                        setSelected((current) =>
                          e.target.checked
                            ? [...current, r.estabelecimentoId]
                            : current.filter((id) => id !== r.estabelecimentoId),
                        );
                        setConfirm(false);
                      }}
                    />
                  </label>
                ),
              },
              { label: 'Estabelecimento', render: (r) => r.nome },
              {
                label: 'E-mail do administrador',
                render: (r) => r.email ?? 'Sem administrador ativo',
              },
              { label: 'Boas-vindas', render: (r) => statusLabel(r.boasVindasStatus) },
              { label: 'Orientação Asaas', render: (r) => statusLabel(r.orientacaoAsaasStatus) },
            ]}
          />
          {rows.length === 0 && <p>Nenhum estabelecimento encontrado.</p>}
          <div className="bo-actions">
            {confirm ? (
              <>
                <p>
                  Enfileirar “{template?.nome}” para {ids.length} estabelecimento(s)? O destinatário
                  será o administrador ativo cadastrado.
                </p>
                <Button
                  variant="secondary"
                  disabled={action.isPending}
                  onClick={() => setConfirm(false)}
                >
                  Voltar
                </Button>
                <Button
                  data-testid="bo-email-confirm"
                  disabled={!data?.habilitado || !ids.length || ids.length > 1000}
                  busy={action.isPending}
                  onClick={() =>
                    action.mutate(
                      { modelo, estabelecimentoIds: ids },
                      {
                        onSuccess: () => {
                          setSelected([]);
                          setConfirm(false);
                        },
                      },
                    )
                  }
                >
                  Confirmar envio
                </Button>
              </>
            ) : (
              <Button
                data-testid="bo-email-send"
                disabled={!data?.habilitado || !ids.length || ids.length > 1000}
                onClick={() => setConfirm(true)}
              >
                Revisar envio
              </Button>
            )}
          </div>
        </>
      )}
    </>
  );
}

import { useState } from 'react';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { useRecords, useSaveRecord, useCommand } from '../shared/hooks';
import { password, email } from '../auth/authSchema';
import { Button, Modal, StatusBadge, Skeleton, EmptyState } from '../../ui';
import { RecordForm, type FormSpec } from '../../components/RecordForm';
import { DataTable } from '../../components/DataTable';
import { Pagination } from '../../components/Pagination';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { dateTime } from '../../lib/format';
import type { Entity } from '../../lib/types';
interface User extends Entity {
  usuarioId: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  deveTrocarSenha: boolean;
  criadoEm: string;
  ultimoAcessoEm: string | null;
}
const name = z.string().trim().min(1, 'Informe o nome.').max(200);
const createSpec: FormSpec = {
  schema: z.object({ nome: name, email, senhaProvisoria: password }),
  defaults: { nome: '', email: '', senhaProvisoria: '' },
  fields: [
    { name: 'nome', label: 'Nome do funcionário' },
    { name: 'email', label: 'E-mail de acesso', kind: 'email' },
    {
      name: 'senhaProvisoria',
      label: 'Senha provisória',
      kind: 'password',
      hint: 'Pelo menos 6 caracteres. Válida por 24 horas; o funcionário deve trocá-la ao entrar.',
    },
  ],
};
const editSpec: FormSpec = {
  schema: z.object({ nome: name, email, ativo: z.enum(['true', 'false']) }),
  defaults: { nome: '', email: '', ativo: 'true' },
  fields: [
    { name: 'nome', label: 'Nome do funcionário' },
    { name: 'email', label: 'E-mail de acesso', kind: 'email' },
    {
      name: 'ativo',
      label: 'Acesso',
      kind: 'select',
      options: [
        { value: 'true', label: 'Ativo' },
        { value: 'false', label: 'Desativado' },
      ],
    },
  ],
};
const resetSpec: FormSpec = {
  schema: z.object({ senhaProvisoria: password }),
  defaults: { senhaProvisoria: '' },
  fields: [
    {
      name: 'senhaProvisoria',
      label: 'Nova senha provisória',
      kind: 'password',
      hint: 'Válida por 24 horas. As sessões anteriores serão encerradas.',
    },
  ],
};
export function UsersPage() {
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ type: 'new' | 'edit' | 'reset'; user?: User } | null>(null);
  const q = useRecords<User>('usuarios', page);
  const save = useSaveRecord<User>('usuarios');
  const reset = useCommand<User>('usuarios');
  const open = (type: 'new' | 'edit' | 'reset', user?: User) => {
    save.reset();
    reset.reset();
    setModal({ type, user });
  };
  const spec = modal?.type === 'reset' ? resetSpec : modal?.type === 'edit' ? editSpec : createSpec;
  const pending = save.isPending || reset.isPending;
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRAÇÃO"
        title="Equipe e acesso"
        description="Você administra o estacionamento. Sua equipe cuida da operação."
        action={
          <Button data-testid="user-new" onClick={() => open('new')}>
            <Plus size={18} />
            Adicionar funcionário
          </Button>
        }
      />
      <p className="notice">
        Funcionários podem cadastrar clientes e veículos e operar estadias e serviços.
        Configurações, financeiro e gestão de acessos ficam com o Administrador.
      </p>
      <section className="panel">
        {q.isPending ? (
          <Skeleton />
        ) : q.isError ? (
          <QueryError error={q.error} what="os usuários" onRetry={() => void q.refetch()} />
        ) : q.data.items.length ? (
          <DataTable
            rows={q.data.items}
            rowKey={(r) => r.usuarioId}
            testId="users-table"
            caption="Equipe"
            columns={[
              {
                label: 'Pessoa',
                render: (r) => (
                  <div>
                    <strong>{r.nome}</strong>
                    <small>{r.email}</small>
                  </div>
                ),
              },
              {
                label: 'Perfil',
                render: (r) => (r.perfil === 'Admin' ? 'Administrador' : 'Funcionário'),
              },
              {
                label: 'Acesso',
                render: (r) => (
                  <StatusBadge
                    status={r.ativo ? 'ATIVA' : 'ENCERRADA'}
                    label={
                      r.ativo
                        ? r.deveTrocarSenha
                          ? 'Troca de senha pendente'
                          : 'Ativo'
                        : 'Desativado'
                    }
                  />
                ),
              },
              { label: 'Último acesso', render: (r) => dateTime(r.ultimoAcessoEm) },
              {
                label: 'Ações',
                render: (r) =>
                  r.perfil === 'Operador' ? (
                    <div className="row-actions">
                      <Button
                        data-testid="user-edit"
                        variant="ghost"
                        onClick={() => open('edit', r)}
                      >
                        Editar
                      </Button>
                      <Button
                        data-testid="user-reset"
                        variant="ghost"
                        onClick={() => open('reset', r)}
                      >
                        Redefinir senha
                      </Button>
                    </div>
                  ) : (
                    'Dono do estacionamento'
                  ),
              },
            ]}
          />
        ) : (
          <EmptyState title="Nenhuma conta" description="As contas cadastradas aparecerão aqui." />
        )}
        {q.data && <Pagination page={page} size={20} total={q.data.total} onChange={setPage} />}
      </section>
      <Modal
        open={modal !== null}
        busy={pending}
        onClose={() => setModal(null)}
        title={
          modal?.type === 'reset'
            ? 'Redefinir senha'
            : modal?.type === 'edit'
              ? 'Editar funcionário'
              : 'Adicionar funcionário'
        }
        actions={
          <>
            <Button
              data-testid="user-cancel"
              variant="secondary"
              disabled={pending}
              onClick={() => setModal(null)}
            >
              Cancelar
            </Button>
            <Button data-testid="form-submit" type="submit" form="user-form" busy={pending}>
              Salvar
            </Button>
          </>
        }
      >
        {modal && (
          <RecordForm
            formId="user-form"
            spec={spec}
            initial={
              modal.type === 'edit' && modal.user
                ? {
                    nome: modal.user.nome,
                    email: modal.user.email,
                    ativo: String(modal.user.ativo),
                  }
                : undefined
            }
            error={save.error || reset.error}
            onSubmit={async (values) => {
              try {
                if (modal.type === 'reset')
                  await reset.mutateAsync({
                    action: modal.user!.usuarioId + '/redefinir-senha',
                    data: values,
                  });
                else
                  await save.mutateAsync({
                    id: modal.type === 'edit' ? modal.user!.usuarioId : undefined,
                    data:
                      modal.type === 'edit'
                        ? { ...values, ativo: values.ativo === 'true' }
                        : values,
                  });
                setModal(null);
              } catch {
                /* Preserve the form and its error. */
              }
            }}
          />
        )}
      </Modal>
    </>
  );
}

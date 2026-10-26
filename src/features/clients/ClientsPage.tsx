import { ResourcePage, type ResourceSpec } from '../../components/ResourcePage';
import type { Cliente } from '../../lib/types';
import { clientsSchema } from './clientsSchema';
import { StatusBadge } from '../../ui';

const spec: ResourceSpec<Cliente> = {
  endpoint: 'clientes',
  id: 'clienteId',
  title: 'Clientes',
  singular: 'cliente',
  description: 'Quem confia o cuidado do veículo a você.',
  eyebrow: 'CADASTROS',
  writeRoles: ['Admin', 'Operador'],
  softDelete: true,
  columns: [
    {
      label: 'Cliente',
      render: (r) => (
        <div className="cell-person">
          <span className="avatar-small">{r.nomeOuRazaoSocial.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{r.nomeOuRazaoSocial}</strong>
            <small>
              #{r.clienteId} · {r.tipoPessoa}
            </small>
          </div>
        </div>
      ),
    },
    { label: 'Documento', render: (r) => r.documento },
    {
      label: 'Contato',
      render: (r) => (
        <div>
          {r.email || '—'}
          <small>{r.celular}</small>
        </div>
      ),
    },
    {
      label: 'Situação',
      render: (r) => (
        <StatusBadge
          status={r.ativo ? 'ATIVA' : 'ENCERRADA'}
          label={r.ativo ? 'Ativo' : 'Inativo'}
        />
      ),
    },
  ],
  form: {
    schema: clientsSchema,
    defaults: {
      tipoPessoa: 'PF',
      documento: '',
      nomeOuRazaoSocial: '',
      email: null,
      celular: null,
    },
    fields: [
      { name: 'nomeOuRazaoSocial', label: 'Nome ou razão social' },
      {
        name: 'tipoPessoa',
        label: 'Tipo de pessoa',
        kind: 'select',
        options: [
          { value: 'PF', label: 'Pessoa física' },
          { value: 'PJ', label: 'Pessoa jurídica' },
        ],
      },
      { name: 'documento', label: 'CPF ou CNPJ', hint: 'Somente números, sem pontuação.' },
      { name: 'email', label: 'E-mail', kind: 'email', optional: true },
      { name: 'celular', label: 'Celular', optional: true },
    ],
  },
};
export function ClientsPage() {
  return <ResourcePage spec={spec} />;
}

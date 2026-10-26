import { ResourcePage, type ResourceSpec } from '../../components/ResourcePage';
import type { Servico } from '../../lib/types';
import { servicesSchema } from './servicesSchema';
import { StatusBadge } from '../../ui';
import { label } from '../../lib/labels';

const spec: ResourceSpec<Servico> = {
  endpoint: 'servicos',
  id: 'servicoId',
  title: 'Serviços',
  singular: 'serviço',
  description: 'Seu catálogo de cuidados, da lavagem à pintura.',
  eyebrow: 'CONFIGURAÇÕES',
  writeRoles: ['Admin'],
  softDelete: true,
  columns: [
    { label: 'Serviço', render: (r) => <strong>{r.nome}</strong> },
    { label: 'Área', render: (r) => label(r.modulo) },
    { label: 'Descrição', render: (r) => r.descricao || '—' },
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
    schema: servicesSchema,
    defaults: { nome: '', modulo: 'LAVA_RAPIDO', descricao: null },
    fields: [
      { name: 'nome', label: 'Nome do serviço' },
      {
        name: 'modulo',
        label: 'Área de atendimento',
        kind: 'select',
        options: [
          { value: 'LAVA_RAPIDO', label: 'Lava-rápido' },
          { value: 'FUNILARIA', label: 'Funilaria' },
          { value: 'PINTURA', label: 'Pintura' },
        ],
      },
      { name: 'descricao', label: 'Descrição', kind: 'textarea', optional: true },
    ],
  },
};
export function ServicesPage() {
  return <ResourcePage spec={spec} />;
}

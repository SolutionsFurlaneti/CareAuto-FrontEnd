import { ResourcePage, type ResourceSpec } from '../../components/ResourcePage';
import type { PrecoServico } from '../../lib/types';
import { servicepricesSchema } from './servicepricesSchema';
import { ReferenceLabel } from '../../components/ReferenceLabel';
import { money } from '../../lib/format';

const spec: ResourceSpec<PrecoServico> = {
  endpoint: 'precos-servicos',
  id: 'servicoValorId',
  title: 'Preços dos serviços',
  singular: 'preço',
  description: 'Defina o preço de cada serviço por categoria de veículo.',
  eyebrow: 'CONFIGURAÇÕES',
  writeRoles: ['Admin'],
  softDelete: false,
  columns: [
    {
      label: 'Serviço',
      render: (r) => (
        <ReferenceLabel
          id={r.servicoId}
          resource="servicos"
          idField="servicoId"
          labelField="nome"
        />
      ),
    },
    {
      label: 'Categoria',
      render: (r) => (
        <ReferenceLabel
          id={r.categoriaId}
          resource="categorias-veiculo"
          idField="categoriaId"
          labelField="nome"
        />
      ),
    },
    { label: 'Valor', render: (r) => <strong>{money(r.valor)}</strong> },
    {
      label: 'Previsão',
      render: (r) => (r.tempoEstimadoMinutos ? r.tempoEstimadoMinutos + ' min' : '—'),
    },
  ],
  form: {
    schema: servicepricesSchema,
    defaults: { servicoId: 0, categoriaId: 0, valor: 0, tempoEstimadoMinutos: null },
    fields: [
      {
        name: 'servicoId',
        label: 'Serviço',
        lookup: { resource: 'servicos', id: 'servicoId', label: 'nome' },
      },
      {
        name: 'categoriaId',
        label: 'Categoria',
        lookup: { resource: 'categorias-veiculo', id: 'categoriaId', label: 'nome' },
      },
      { name: 'valor', label: 'Preço do serviço', kind: 'money' },
      {
        name: 'tempoEstimadoMinutos',
        label: 'Tempo estimado em minutos',
        kind: 'number',
        optional: true,
      },
    ],
  },
};
export function ServicePricesPage() {
  return <ResourcePage spec={spec} />;
}

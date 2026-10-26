import { ResourcePage, type ResourceSpec } from '../../components/ResourcePage';
import type { Tabela } from '../../lib/types';
import { pricesSchema } from './pricesSchema';
import { StatusBadge } from '../../ui';
import { money } from '../../lib/format';
import { label } from '../../lib/labels';

const spec: ResourceSpec<Tabela> = {
  endpoint: 'tabelas-preco',
  id: 'tabelaId',
  title: 'Tabelas de preços',
  singular: 'tabela',
  description: 'Configure as regras de cobrança do estacionamento.',
  eyebrow: 'CONFIGURAÇÕES',
  writeRoles: ['Admin'],
  softDelete: true,
  columns: [
    { label: 'Tabela', render: (r) => <strong>{r.nome}</strong> },
    { label: 'Cobrança', render: (r) => label(r.tipoCobranca) },
    { label: 'Hora', render: (r) => money(r.valorHora) },
    { label: 'Diária', render: (r) => money(r.valorDiaria) },
    { label: 'Mensalidade', render: (r) => money(r.valorMensalidade) },
    { label: 'Tolerância', render: (r) => r.toleranciaMinutos + ' min' },
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
    schema: pricesSchema,
    defaults: {
      nome: '',
      tipoCobranca: 'AVULSO',
      valorHora: 0,
      valorDiaria: null,
      valorMensalidade: null,
      toleranciaMinutos: 15,
    },
    fields: [
      { name: 'nome', label: 'Nome da tabela' },
      {
        name: 'tipoCobranca',
        label: 'Tipo de cobrança',
        kind: 'select',
        options: [
          { value: 'AVULSO', label: 'Avulso' },
          { value: 'MENSAL', label: 'Mensal' },
        ],
      },
      { name: 'valorHora', label: 'Valor por hora', kind: 'money', optional: true },
      { name: 'valorDiaria', label: 'Limite por diária', kind: 'money', optional: true },
      {
        name: 'valorMensalidade',
        label: 'Mensalidade de referência',
        kind: 'money',
        optional: true,
      },
      { name: 'toleranciaMinutos', label: 'Tolerância em minutos', kind: 'number' },
    ],
  },
};
export function PricesPage() {
  return <ResourcePage spec={spec} />;
}

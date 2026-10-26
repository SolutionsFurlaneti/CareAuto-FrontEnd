import { ResourcePage, type ResourceSpec } from '../../components/ResourcePage';
import type { Taxa } from '../../lib/types';
import { ratesSchema } from './ratesSchema';
import { StatusBadge } from '../../ui';
import { ReferenceLabel } from '../../components/ReferenceLabel';
import { money } from '../../lib/format';

const spec: ResourceSpec<Taxa> = {
  endpoint: 'taxas-dinamicas',
  id: 'taxaId',
  title: 'Taxas dinâmicas',
  singular: 'taxa',
  description: 'Ajuste o valor da hora de acordo com o dia da entrada.',
  eyebrow: 'CONFIGURAÇÕES',
  writeRoles: ['Admin'],
  softDelete: true,
  columns: [
    {
      label: 'Tabela',
      render: (r) => (
        <ReferenceLabel
          id={r.tabelaId}
          resource="tabelas-preco"
          idField="tabelaId"
          labelField="nome"
        />
      ),
    },
    {
      label: 'Dia',
      render: (r) =>
        ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][r.diaSemana - 1],
    },
    {
      label: 'Multiplicador',
      render: (r) =>
        r.multiplicador === null ? '—' : r.multiplicador.toLocaleString('pt-BR') + '×',
    },
    { label: 'Hora fixa', render: (r) => money(r.valorFixoHora) },
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
    schema: ratesSchema,
    defaults: { tabelaId: 0, diaSemana: 2, multiplicador: 1, valorFixoHora: null },
    fields: [
      {
        name: 'tabelaId',
        label: 'Tabela avulsa',
        lookup: { resource: 'tabelas-preco', id: 'tabelaId', label: 'nome' },
      },
      {
        name: 'diaSemana',
        label: 'Dia da semana',
        kind: 'select',
        options: [
          { value: 1, label: 'Domingo' },
          { value: 2, label: 'Segunda-feira' },
          { value: 3, label: 'Terça-feira' },
          { value: 4, label: 'Quarta-feira' },
          { value: 5, label: 'Quinta-feira' },
          { value: 6, label: 'Sexta-feira' },
          { value: 7, label: 'Sábado' },
        ],
      },
      {
        name: 'multiplicador',
        label: 'Multiplicador',
        kind: 'number',
        optional: true,
        hint: '1,20 representa um acréscimo de 20%.',
      },
      { name: 'valorFixoHora', label: 'Valor fixo por hora', kind: 'money', optional: true },
    ],
  },
};
export function RatesPage() {
  return <ResourcePage spec={spec} />;
}

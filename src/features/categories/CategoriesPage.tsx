import { ResourcePage, type ResourceSpec } from '../../components/ResourcePage';
import type { Categoria } from '../../lib/types';
import { categoriesSchema } from './categoriesSchema';
import { StatusBadge } from '../../ui';

const spec: ResourceSpec<Categoria> = {
  endpoint: 'categorias-veiculo',
  id: 'categoriaId',
  title: 'Categorias de veículos',
  singular: 'categoria',
  description: 'Organize as carrocerias e os preços de cada categoria.',
  eyebrow: 'CONFIGURAÇÕES',
  writeRoles: ['Admin'],
  softDelete: true,
  columns: [
    { label: 'Categoria', render: (r) => <strong>{r.nome}</strong> },
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
    schema: categoriesSchema,
    defaults: { nome: '', descricao: null },
    fields: [
      { name: 'nome', label: 'Nome da categoria' },
      { name: 'descricao', label: 'Descrição', kind: 'textarea', optional: true },
    ],
  },
};
export function CategoriesPage() {
  return <ResourcePage spec={spec} />;
}

import { ResourcePage, type ResourceSpec } from '../../components/ResourcePage';
import type { Veiculo } from '../../lib/types';
import { vehicleFormSpec } from './vehicleFormSpec';
import { ReferenceLabel } from '../../components/ReferenceLabel';

const spec: ResourceSpec<Veiculo> = {
  endpoint: 'veiculos',
  id: 'veiculoId',
  title: 'Veículos',
  singular: 'veículo',
  description: 'Identificação, categoria e vínculo de cada veículo.',
  eyebrow: 'CADASTROS',
  writeRoles: ['Admin', 'Operador'],
  softDelete: false,
  columns: [
    { label: 'Placa', render: (r) => <span className="plate">{r.placa}</span> },
    {
      label: 'Veículo',
      render: (r) => (
        <div>
          <strong>{[r.marca, r.modelo].filter(Boolean).join(' ') || 'Não informado'}</strong>
          <small>{r.cor || 'Cor não informada'}</small>
        </div>
      ),
    },
    {
      label: 'Cliente',
      render: (r) => (
        <ReferenceLabel
          id={r.clienteId}
          resource="clientes"
          idField="clienteId"
          labelField="nomeOuRazaoSocial"
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
  ],
  form: vehicleFormSpec,
};
export function VehiclesPage() {
  return <ResourcePage spec={spec} />;
}

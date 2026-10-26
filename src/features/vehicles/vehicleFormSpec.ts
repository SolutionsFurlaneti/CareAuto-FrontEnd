import type { FormSpec } from '../../components/RecordForm';
import { vehiclesSchema } from './vehiclesSchema';
import { PlateCapture } from './PlateCapture';

export const vehicleFormSpec: FormSpec = {
  schema: vehiclesSchema,
  defaults: {
    clienteId: null,
    categoriaId: 0,
    placa: '',
    marca: null,
    modelo: null,
    cor: null,
    situacaoVeiculo: null,
  },
  fields: [
    { name: 'placa', label: 'Placa', component: PlateCapture },
    {
      name: 'categoriaId',
      label: 'Categoria',
      lookup: { resource: 'categorias-veiculo', id: 'categoriaId', label: 'nome' },
    },
    {
      name: 'clienteId',
      label: 'Cliente',
      optional: true,
      lookup: { resource: 'clientes', id: 'clienteId', label: 'nomeOuRazaoSocial' },
    },
    { name: 'marca', label: 'Marca', optional: true },
    { name: 'modelo', label: 'Modelo', optional: true },
    { name: 'cor', label: 'Cor', optional: true },
    { name: 'situacaoVeiculo', label: 'Situação do veículo', optional: true },
  ],
};

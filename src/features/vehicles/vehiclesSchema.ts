import { z } from 'zod';
import { requiredText, nullableText, id } from '../shared/schema';
import { isPlate, normalizePlate } from './plate';
export const vehiclesSchema = z.object({
  clienteId: id.nullable(),
  categoriaId: id,
  placa: requiredText(10)
    .transform(normalizePlate)
    .refine(isPlate, 'Informe uma placa válida, como ABC1D23.'),
  marca: nullableText(50),
  modelo: nullableText(100),
  cor: nullableText(30),
  situacaoVeiculo: nullableText(100),
});
export type VehiclesFormData = z.infer<typeof vehiclesSchema>;

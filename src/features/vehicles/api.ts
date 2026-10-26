import { ApiError } from '../../lib/apiClient';
import { normalizePlate } from './plate';
import { allRecords, listRecords, saveRecord } from '../shared/api';
import type { Veiculo } from '../../lib/types';
import { vehiclesSchema, type VehiclesFormData } from './vehiclesSchema';
export const listVehicles = (page: number, signal?: AbortSignal) =>
  listRecords<Veiculo>('veiculos', page, signal);
export const saveVehicles = (data: VehiclesFormData, id?: number) =>
  saveRecord<Veiculo>('veiculos', data, id);

/** Entrada reutiliza a placa cadastrada, sem sobrescrever cliente ou dados do veículo. */
export async function resolveEntryVehicle(data: Record<string, unknown>): Promise<Veiculo> {
  const plate = normalizePlate(String(data.placa ?? ''));
  const find = async () =>
    (await allRecords<Veiculo>('veiculos')).find(
      (vehicle) => normalizePlate(vehicle.placa) === plate,
    );
  const existing = await find();
  if (existing) return existing;
  const parsed = vehiclesSchema.safeParse(data);
  if (!parsed.success)
    throw new ApiError(
      400,
      'Validation',
      'Confira os dados do novo veículo.',
      parsed.error.flatten().fieldErrors,
    );
  try {
    return await saveRecord<Veiculo>('veiculos', parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      // Outro operador pode ter cadastrado a placa entre a consulta e a criação.
      const concurrent = await find();
      if (concurrent) return concurrent;
    }
    throw error;
  }
}

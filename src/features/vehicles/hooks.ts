import { resourceKeys } from '../shared/hooks';
export const vehiclesKeys = {
  all: (userId: string | null) => resourceKeys.all('veiculos', userId),
};

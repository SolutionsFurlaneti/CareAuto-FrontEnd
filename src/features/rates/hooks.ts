import { resourceKeys } from '../shared/hooks';
export const ratesKeys = {
  all: (userId: string | null) => resourceKeys.all('taxas-dinamicas', userId),
};

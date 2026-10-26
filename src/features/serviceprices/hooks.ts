import { resourceKeys } from '../shared/hooks';
export const servicepricesKeys = {
  all: (userId: string | null) => resourceKeys.all('precos-servicos', userId),
};

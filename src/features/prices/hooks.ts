import { resourceKeys } from '../shared/hooks';
export const pricesKeys = {
  all: (userId: string | null) => resourceKeys.all('tabelas-preco', userId),
};

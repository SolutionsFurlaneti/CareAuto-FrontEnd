import { resourceKeys } from '../shared/hooks';
export const categoriesKeys = {
  all: (userId: string | null) => resourceKeys.all('categorias-veiculo', userId),
};

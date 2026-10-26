import { resourceKeys } from '../shared/hooks';
export const servicesKeys = {
  all: (userId: string | null) => resourceKeys.all('servicos', userId),
};

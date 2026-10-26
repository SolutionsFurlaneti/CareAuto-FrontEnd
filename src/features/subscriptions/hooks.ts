import { resourceKeys } from '../shared/hooks';
export const subscriptionsKeys = {
  all: (userId: string | null) => resourceKeys.all('assinaturas', userId),
};

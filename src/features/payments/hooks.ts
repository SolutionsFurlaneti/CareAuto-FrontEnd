import { resourceKeys } from '../shared/hooks';
export const paymentsKeys = {
  all: (userId: string | null) => resourceKeys.all('pagamentos', userId),
};

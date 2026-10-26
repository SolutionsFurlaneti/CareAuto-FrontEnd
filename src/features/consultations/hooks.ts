import { resourceKeys } from '../shared/hooks';
export const consultationsKeys = {
  all: (userId: string | null) => resourceKeys.all('consultas-placa', userId),
};

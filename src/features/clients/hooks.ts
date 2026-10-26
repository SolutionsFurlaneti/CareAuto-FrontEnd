import { resourceKeys } from '../shared/hooks';
export const clientsKeys = { all: (userId: string | null) => resourceKeys.all('clientes', userId) };

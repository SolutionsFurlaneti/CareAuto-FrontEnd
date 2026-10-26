import { allRecords } from '../shared/api';
import { hasRole, type Role } from '../../stores/authStore';
import type { Estadia, Veiculo, Pagamento, Assinatura } from '../../lib/types';
export async function getOverview(roles: Role[], signal?: AbortSignal) {
  const operation = hasRole(roles, ['Admin', 'Operador']);
  const financial = hasRole(roles, ['Admin', 'Financeiro', 'Cliente']);
  const [stays, vehicles, payments, subscriptions] = await Promise.all([
    operation ? allRecords<Estadia>('estadias', signal) : [],
    operation ? allRecords<Veiculo>('veiculos', signal) : [],
    financial ? allRecords<Pagamento>('pagamentos', signal) : [],
    financial ? allRecords<Assinatura>('assinaturas', signal) : [],
  ]);
  return { stays, vehicles, payments, subscriptions, operation, financial };
}

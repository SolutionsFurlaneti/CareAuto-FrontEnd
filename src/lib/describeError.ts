import { ApiError } from './apiClient';
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError))
    return error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.';
  switch (error.code) {
    case 'Network.Unreachable':
      return 'Não foi possível acessar o servidor. Verifique a conexão e tente novamente.';
    case 'Auth.SessionExpired':
      return 'Sua sessão expirou. Entre novamente.';
    case 'Validation.Failed':
      return (
        Object.values(error.fieldErrors || {})
          .flat()
          .join(' ') || 'Revise os campos informados.'
      );
    case 'Http.403':
      return 'Seu perfil não permite esta operação.';
    case 'Http.404':
    case 'recurso.nao_encontrado':
      return 'O registro não foi encontrado ou não está disponível para você.';
    case 'Http.500':
      return error.traceId
        ? `O servidor não conseguiu concluir a operação. Informe este código ao suporte: ${error.traceId}.`
        : 'O servidor não conseguiu concluir a operação. Tente novamente.';
    default:
      return error.message === error.code ? 'Não foi possível concluir a operação.' : error.message;
  }
}

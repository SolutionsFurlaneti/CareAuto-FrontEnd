import { ApiError } from './apiClient';
import { translate as t } from '../i18n';
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError))
    return t(
      error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.',
    );
  switch (error.code) {
    case 'Network.Unreachable':
      return t('Não foi possível acessar o servidor. Verifique a conexão e tente novamente.');
    case 'Auth.SessionExpired':
      return t('Sua sessão expirou. Entre novamente.');
    case 'Validation.Failed':
      return (
        Object.values(error.fieldErrors || {})
          .flat()
          .map((message) => t(message))
          .join(' ') || t('Revise os campos informados.')
      );
    case 'Http.403':
      return t('Seu perfil não permite esta operação.');
    case 'Http.404':
    case 'recurso.nao_encontrado':
      return t('O registro não foi encontrado ou não está disponível para você.');
    case 'Http.500':
      return error.traceId
        ? t(
            'O servidor não conseguiu concluir a operação. Informe este código ao suporte: {traceId}.',
            { traceId: error.traceId },
          )
        : t('O servidor não conseguiu concluir a operação. Tente novamente.');
    default:
      return t(
        error.message === error.code ? 'Não foi possível concluir a operação.' : error.message,
      );
  }
}

import { z } from 'zod';

/** Configuração completa, como aceita pelo PUT. */
export const asaasSchema = z
  .object({
    ativo: z.enum(['true', 'false']),
    ambiente: z.enum(['SANDBOX', 'PRODUCAO']),
    chaveApi: z.string().max(512).nullable(),
    tokenWebhook: z.string().max(255).nullable(),
    removerCredenciais: z.enum(['true', 'false']),
  })
  .superRefine((v, ctx) => {
    if (v.tokenWebhook && (v.tokenWebhook.length < 32 || /\s/.test(v.tokenWebhook)))
      ctx.addIssue({
        code: 'custom',
        path: ['tokenWebhook'],
        message: 'Use de 32 a 255 caracteres, sem espaços.',
      });
    if (v.removerCredenciais === 'true' && (v.ativo === 'true' || v.chaveApi || v.tokenWebhook))
      ctx.addIssue({
        code: 'custom',
        path: ['removerCredenciais'],
        message: 'Desative e deixe as novas credenciais vazias para remover.',
      });
  });

export interface AsaasSavedState {
  ambiente: string;
  possuiChaveApi: boolean;
  possuiTokenWebhook: boolean;
  /** null enquanto a configuração nunca foi salva. */
  versao: string | null;
}

/**
 * Aba Credenciais: espelha as regras do backend que dependem do que já está salvo.
 * Chave e token andam juntos: ativar exige os dois, e trocar o ambiente exige os dois novos.
 */
export const asaasCredentialsSchema = (saved: AsaasSavedState) =>
  asaasSchema.superRefine((v, ctx) => {
    if (v.removerCredenciais === 'true') return;
    if (saved.versao !== null && v.ambiente !== saved.ambiente) {
      if (!v.chaveApi)
        ctx.addIssue({
          code: 'custom',
          path: ['chaveApi'],
          message: 'Ao trocar o ambiente, informe a chave do novo ambiente.',
        });
      if (!v.tokenWebhook)
        ctx.addIssue({
          code: 'custom',
          path: ['tokenWebhook'],
          message: 'Ao trocar o ambiente, informe o token do webhook do novo ambiente.',
        });
      return;
    }
    if (v.ativo !== 'true') return;
    if (!saved.possuiChaveApi && !v.chaveApi)
      ctx.addIssue({
        code: 'custom',
        path: ['chaveApi'],
        message: 'Informe a chave de API para ativar.',
      });
    if (!saved.possuiTokenWebhook && !v.tokenWebhook)
      ctx.addIssue({
        code: 'custom',
        path: ['tokenWebhook'],
        message: 'Informe o token do webhook para ativar.',
      });
  });

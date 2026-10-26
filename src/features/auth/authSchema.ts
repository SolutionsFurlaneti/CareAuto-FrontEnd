import { z } from 'zod';
export const password = z
  .string()
  .min(6, 'Use pelo menos 6 caracteres.')
  .max(128, 'Use até 128 caracteres.');
export const email = z.string().trim().email('Informe um e-mail válido.').max(256);
export const loginSchema = z.object({
  email,
  senha: z.string().min(1, 'Informe sua senha.').max(128),
});
export const setupSchema = z
  .object({
    estacionamento: z.string().trim().min(1).max(200),
    tipoPessoa: z.enum(['PF', 'PJ']),
    documento: z.string().regex(/^\d{11}(\d{3})?$/, 'Informe CPF ou CNPJ somente com dígitos.'),
    nome: z.string().trim().min(1, 'Informe seu nome.').max(200),
    email,
    telefone: z.string().trim().max(30).refine((value) => {
      if (!value) return true;
      if (!/^[+\d\s().-]+$/.test(value)) return false;
      const digits = value.replace(/\D/g, '');
      return digits.length === 10 || digits.length === 11
        || ((digits.length === 12 || digits.length === 13) && digits.startsWith('55'));
    }, 'Informe um telefone brasileiro com DDD.').nullable().default(null),
    senha: password,
    confirmarSenha: password,
  })
  .superRefine((v, ctx) => {
    if (v.documento.length !== (v.tipoPessoa === 'PF' ? 11 : 14))
      ctx.addIssue({
        code: 'custom',
        path: ['documento'],
        message: 'Confira o tipo e o documento informado.',
      });
    if (v.senha !== v.confirmarSenha)
      ctx.addIssue({
        code: 'custom',
        path: ['confirmarSenha'],
        message: 'As senhas precisam ser iguais.',
      });
  });
export const changePasswordSchema = z
  .object({ senhaAtual: z.string().min(1).max(128), novaSenha: password, confirmarSenha: password })
  .superRefine((v, ctx) => {
    if (v.novaSenha !== v.confirmarSenha)
      ctx.addIssue({
        code: 'custom',
        path: ['confirmarSenha'],
        message: 'As senhas precisam ser iguais.',
      });
    if (v.novaSenha === v.senhaAtual)
      ctx.addIssue({
        code: 'custom',
        path: ['novaSenha'],
        message: 'Escolha uma senha diferente da atual.',
      });
  });

export const recoverySchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.').max(256),
});

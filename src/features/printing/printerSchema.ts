import { z } from 'zod';

const host =
  /^(?=.{1,250}$)[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;
const ipv4 = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

export const printerSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(1, 'Informe um nome, como Guarita 1.')
      .max(100, 'Nome muito longo.'),
    tipoConexao: z.enum(['USB_WINDOWS', 'REDE_TCP']),
    enderecoDriverOuIp: z
      .string()
      .trim()
      .min(1, 'Preencha este campo.')
      .max(250, 'Texto muito longo.'),
    portaTcp: z
      .number()
      .int()
      .min(1, 'Porta entre 1 e 65535.')
      .max(65535, 'Porta entre 1 e 65535.')
      .nullable(),
    imprimeEntrada: z.boolean(),
    imprimeFechamento: z.boolean(),
    ativo: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.tipoConexao === 'REDE_TCP') {
      if (v.portaTcp === null)
        ctx.addIssue({
          code: 'custom',
          path: ['portaTcp'],
          message: 'Informe a porta TCP (geralmente 9100).',
        });
      // Endereços só com dígitos e pontos precisam ser IPv4 válidos (300.1.1.1 não é um nome de rede).
      const numeric = /^[\d.]+$/.test(v.enderecoDriverOuIp);
      if (numeric ? !ipv4.test(v.enderecoDriverOuIp) : !host.test(v.enderecoDriverOuIp))
        ctx.addIssue({
          code: 'custom',
          path: ['enderecoDriverOuIp'],
          message: 'Informe um IP (ex.: 192.168.0.50) ou nome de rede válido.',
        });
    }
    if (!v.imprimeEntrada && !v.imprimeFechamento)
      ctx.addIssue({
        code: 'custom',
        path: ['imprimeFechamento'],
        message: 'Escolha ao menos uma função: entrada ou fechamento.',
      });
  });
export type PrinterFormData = z.infer<typeof printerSchema>;

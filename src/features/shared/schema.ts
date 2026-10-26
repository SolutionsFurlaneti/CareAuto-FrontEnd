import { z } from 'zod';
export const requiredText = (max: number) =>
  z.string().trim().min(1, 'Preencha este campo.').max(max, 'Texto muito longo.');
export const nullableText = (max: number) =>
  z.string().trim().max(max, 'Texto muito longo.').nullable();
export const id = z
  .number({ invalid_type_error: 'Escolha um registro.' })
  .int()
  .positive('Escolha um registro.');
export const amount = z
  .number()
  .min(0, 'Informe um valor positivo.')
  .max(99999999.99, 'Valor acima do limite.')
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001, 'Use até duas casas decimais.');
export type FormValues = Record<string, string | number | null>;

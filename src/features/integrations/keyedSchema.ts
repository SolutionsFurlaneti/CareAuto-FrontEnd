import { z } from 'zod';
import type { FieldSpec } from '../../components/RecordForm';
import type { FormValues } from '../shared/schema';
import type { BaseConfiguration } from './catalog';
import type { TabFormSpec } from './IntegrationForm';

/** Configuração de Claude e Consulta de placas (respostas nunca trazem segredos). */
export interface KeyedConfiguration extends BaseConfiguration {
  nomeChave?: string;
  possuiChaveApi?: boolean;
  possuiToken?: boolean;
  modelo?: string;
  enderecoHttp?: string;
  versaoApi?: string;
  maximoTokens?: number;
  tempoEsgotadoSegundos?: number;
  urlTemplate?: string;
  atualizadoPor: string | null;
}
export type KeyedSlug = 'claude' | 'consulta-placa';

export const claudeUrl = 'https://api.anthropic.com/v1/messages';
export const plateUrl = 'https://wdapi2.com.br/consulta/{placa}/{token}';
const toggle = z.enum(['true', 'false']);
const secret = z.string().max(512).nullable();

const secretNames = (slug: KeyedSlug) =>
  slug === 'claude'
    ? ({ secret: 'chaveApi', remove: 'removerChaveApi' } as const)
    : ({ secret: 'token', remove: 'removerToken' } as const);
export const hasSavedSecret = (slug: KeyedSlug, data: KeyedConfiguration) =>
  !!(slug === 'claude' ? data.possuiChaveApi : data.possuiToken);

/** Corpo completo do PUT com os valores já salvos e as credenciais mantidas. */
export function savedBody(slug: KeyedSlug, data: KeyedConfiguration): Record<string, unknown> {
  const names = secretNames(slug);
  return {
    ativo: data.ativo,
    [names.secret]: null,
    [names.remove]: false,
    versao: data.versao,
    ...(slug === 'claude'
      ? {
          nomeChave: data.nomeChave ?? '',
          modelo: data.modelo ?? '',
          enderecoHttp: data.enderecoHttp ?? claudeUrl,
          versaoApi: data.versaoApi ?? '',
          maximoTokens: data.maximoTokens ?? 512,
          tempoEsgotadoSegundos: data.tempoEsgotadoSegundos ?? 45,
        }
      : { urlTemplate: data.urlTemplate ?? plateUrl }),
  };
}

/** Aba Credenciais: ativação, nome da chave (Claude), nova credencial e remoção. */
export function credentialsForm(slug: KeyedSlug, data: KeyedConfiguration): TabFormSpec {
  const claude = slug === 'claude';
  const names = secretNames(slug);
  const saved = hasSavedSecret(slug, data);
  const shape = {
    ativo: toggle,
    [names.secret]: secret,
    [names.remove]: toggle,
    ...(claude ? { nomeChave: z.string().trim().min(1).max(100) } : {}),
  };
  const schema = z.object(shape).superRefine((raw, ctx) => {
    const values = raw as FormValues;
    if (
      values.ativo === 'true' &&
      ((!saved && !values[names.secret]) || values[names.remove] === 'true')
    )
      ctx.addIssue({
        code: 'custom',
        path: [names.secret],
        message: 'Informe a credencial para ativar a integração.',
      });
    if (values[names.remove] === 'true' && values[names.secret])
      ctx.addIssue({
        code: 'custom',
        path: [names.remove],
        message: 'Deixe a nova credencial vazia para remover.',
      });
  }) as unknown as z.ZodType<FormValues>;
  const fields: FieldSpec[] = [
    {
      name: 'ativo',
      label: 'Integração',
      kind: 'select',
      options: [
        { value: 'true', label: 'Ativada' },
        { value: 'false', label: 'Desativada' },
      ],
    },
    ...(claude ? [{ name: 'nomeChave', label: 'Nome da chave' }] : []),
    {
      name: names.secret,
      label: claude ? 'Nova chave de API' : 'Novo token',
      kind: 'password',
      optional: true,
      hint: saved
        ? 'Credencial salva: ••••••••. Deixe vazio para mantê-la.'
        : 'Nenhuma credencial salva.',
    },
    {
      name: names.remove,
      label: 'Credencial salva',
      kind: 'select',
      options: [
        { value: 'false', label: 'Manter (ou substituir pela nova)' },
        { value: 'true', label: 'Remover e manter desativada' },
      ],
    },
  ];
  return {
    spec: {
      schema,
      fields,
      defaults: {
        ativo: String(data.ativo),
        [names.secret]: null,
        [names.remove]: 'false',
        ...(claude ? { nomeChave: data.nomeChave ?? '' } : {}),
      },
    },
    toBody: (values) => ({
      ...savedBody(slug, data),
      ...values,
      ativo: values.ativo === 'true',
      [names.remove]: values[names.remove] === 'true',
    }),
  };
}

/** Aba Configurações: parâmetros técnicos, sem credenciais. */
export function settingsForm(slug: KeyedSlug, data: KeyedConfiguration): TabFormSpec {
  const body = savedBody(slug, data);
  if (slug === 'claude')
    return {
      spec: {
        schema: z.object({
          modelo: z
            .string()
            .trim()
            .min(1)
            .max(100)
            .regex(/^[a-zA-Z0-9._-]+$/),
          enderecoHttp: z.literal(claudeUrl),
          versaoApi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          maximoTokens: z.number().int().min(128).max(2048),
          tempoEsgotadoSegundos: z.number().int().min(5).max(60),
        }),
        defaults: {
          modelo: body.modelo as string,
          enderecoHttp: body.enderecoHttp as string,
          versaoApi: body.versaoApi as string,
          maximoTokens: body.maximoTokens as number,
          tempoEsgotadoSegundos: body.tempoEsgotadoSegundos as number,
        },
        fields: [
          { name: 'modelo', label: 'Modelo' },
          {
            name: 'enderecoHttp',
            label: 'Endereço da API',
            hint: 'Endpoint oficial da Anthropic.',
          },
          { name: 'versaoApi', label: 'Versão da API', hint: 'Formato AAAA-MM-DD.' },
          { name: 'maximoTokens', label: 'Máximo de tokens', kind: 'number' },
          { name: 'tempoEsgotadoSegundos', label: 'Tempo limite (segundos)', kind: 'number' },
        ],
      },
      toBody: (values) => ({ ...body, ...values }),
    };
  return {
    spec: {
      schema: z.object({ urlTemplate: z.literal(plateUrl) }),
      defaults: { urlTemplate: body.urlTemplate as string },
      fields: [
        {
          name: 'urlTemplate',
          label: 'URL da consulta',
          hint: 'API Placas: mantenha os marcadores {placa} e {token}.',
        },
      ],
    },
    toBody: (values) => ({ ...body, ...values }),
  };
}

import type { IntegrationTab } from './catalog';
import { IntegrationForm } from './IntegrationForm';
import { StatusSummary } from './StatusSummary';
import {
  credentialsForm,
  hasSavedSecret,
  settingsForm,
  type KeyedConfiguration,
  type KeyedSlug,
} from './keyedSchema';

/** Conteúdo de uma aba de Claude ou Consulta de placas. */
export function KeyedTab({
  slug,
  tab,
  data,
  formKey,
}: {
  slug: KeyedSlug;
  tab: IntegrationTab;
  data: KeyedConfiguration;
  formKey: string;
}) {
  const success = 'Integração salva. A próxima consulta usará esta configuração.';
  if (tab === 'configuracoes')
    return (
      <IntegrationForm
        slug={slug}
        form={settingsForm(slug, data)}
        formKey={formKey}
        submitLabel="Salvar configurações"
        success={success}
      />
    );
  if (tab === 'status')
    return (
      <StatusSummary
        active={data.disponivel ?? data.ativo}
        updatedAt={data.atualizadoEm}
        updatedBy={data.atualizadoPor}
        rows={[
          {
            label: slug === 'claude' ? 'Chave de API' : 'Token',
            value: hasSavedSecret(slug, data)
              ? slug === 'claude'
                ? 'Salva'
                : 'Salvo'
              : slug === 'claude'
                ? 'Não informada'
                : 'Não informado',
          },
          ...(slug === 'claude'
            ? [
                { label: 'Nome da chave', value: data.nomeChave || '—' },
                { label: 'Modelo', value: data.modelo || '—' },
              ]
            : [{ label: 'Provedor', value: 'API Placas (wdapi2.com.br)' }]),
        ]}
      />
    );
  return (
    <IntegrationForm
      slug={slug}
      form={credentialsForm(slug, data)}
      formKey={formKey}
      submitLabel="Salvar credenciais"
      success={success}
    />
  );
}

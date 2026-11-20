import { translate, useI18n } from '../../i18n';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../lib/apiClient';
import { describeError } from '../../lib/describeError';
import { useAuthStore, sessionScope } from '../../stores/authStore';
import { Button } from '../../ui';
import type { BaseConfiguration, IntegrationTab } from './catalog';
import { integrationPath } from './hooks';
import { IntegrationForm, type TabFormSpec } from './IntegrationForm';
import { StatusSummary } from './StatusSummary';
import { asaasCredentialsSchema } from './asaasSchema';

export interface AsaasConfiguration extends BaseConfiguration {
  ambiente: string;
  possuiChaveApi: boolean;
  possuiTokenWebhook: boolean;
  caminhoWebhook: string;
}
const environmentLabel = (value: string) =>
  translate(value === 'PRODUCAO' ? 'Produção — cobranças reais' : 'Sandbox — testes');

/** Corpo completo do PUT com os valores salvos e as credenciais mantidas. */
const savedBody = (data: AsaasConfiguration) => ({
  ativo: data.ativo,
  ambiente: data.ambiente,
  chaveApi: null,
  tokenWebhook: null,
  removerCredenciais: false,
  versao: data.versao,
});

function credentialsForm(data: AsaasConfiguration): TabFormSpec {
  return {
    spec: {
      schema: asaasCredentialsSchema(data),
      defaults: {
        ativo: String(data.ativo),
        ambiente: data.ambiente,
        chaveApi: null,
        tokenWebhook: null,
        removerCredenciais: 'false',
      },
      fields: [
        {
          name: 'ativo',
          label: 'Integração própria',
          kind: 'select',
          options: [
            { value: 'false', label: 'Desativada' },
            { value: 'true', label: 'Ativada' },
          ],
          hint: 'Ative a integração própria para dar prioridade à sua conta; sem chave própria ativa, usa o backoffice. Cobranças antigas mantêm a conta de origem.',
        },
        {
          name: 'ambiente',
          label: 'Ambiente',
          kind: 'select',
          options: [
            { value: 'SANDBOX', label: 'Sandbox — testes' },
            { value: 'PRODUCAO', label: 'Produção — cobranças reais' },
          ],
        },
        {
          name: 'chaveApi',
          label: 'Nova chave de API',
          kind: 'password',
          optional: true,
          hint: data.possuiChaveApi
            ? 'Chave salva: ••••••••. Vazio mantém a atual.'
            : 'Crie a chave na conta Asaas do ambiente selecionado.',
        },
        {
          name: 'tokenWebhook',
          label: 'Novo token do webhook',
          kind: 'password',
          optional: true,
          hint: data.possuiTokenWebhook
            ? 'Token salvo: ••••••••. Vazio mantém o atual.'
            : 'Defina um token aleatório de 32 a 255 caracteres e use o mesmo no painel Asaas.',
        },
        {
          name: 'removerCredenciais',
          label: 'Credenciais salvas',
          kind: 'select',
          options: [
            { value: 'false', label: 'Manter (ou substituir pelas novas)' },
            { value: 'true', label: 'Remover e manter desativada' },
          ],
        },
      ],
    },
    toBody: (v) => ({
      ...savedBody(data),
      ...v,
      ativo: v.ativo === 'true',
      removerCredenciais: v.removerCredenciais === 'true',
    }),
  };
}

function ConnectionTest({ enabled }: { enabled: boolean }) {
  const { t } = useI18n();
  const scope = useAuthStore((s) => sessionScope(s.session));
  const [testing, setTesting] = useState(false);
  async function test() {
    setTesting(true);
    try {
      await api(integrationPath('asaas') + '/teste', { method: 'POST' });
      if (scope === sessionScope(useAuthStore.getState().session))
        toast.success(translate('Conexão com o Asaas confirmada. Nenhuma cobrança foi criada.'));
    } catch (e) {
      if (scope === sessionScope(useAuthStore.getState().session)) toast.error(describeError(e));
    } finally {
      setTesting(false);
    }
  }
  return (
    <div className="integration-actions">
      <Button variant="secondary" busy={testing} disabled={!enabled} onClick={() => void test()}>
        {t('Testar conexão salva')}
      </Button>
      {!enabled && <small>{t('Salve uma chave de API na aba Credenciais para testar.')}</small>}
    </div>
  );
}

/** Conteúdo de uma aba da integração Asaas. */
export function AsaasTab({
  tab,
  data,
  formKey,
  goTo,
}: {
  tab: IntegrationTab;
  data: AsaasConfiguration;
  formKey: string;
  goTo: (tab: IntegrationTab) => void;
}) {
  const { t } = useI18n();
  if (tab === 'webhooks' && data.origem === 'PLATAFORMA')
    return (
      <p>
        {t(
          'O webhook é configurado pela gestão da plataforma. Para usar sua própria conta Asaas, configure as credenciais do estabelecimento.',
        )}
      </p>
    );
  if (tab === 'webhooks')
    return (
      <>
        <p>
          {t(
            'Cadastre um webhook no Asaas com a URL pública HTTPS do backend, seguida deste caminho:',
          )}
        </p>
        <code className="asaas-webhook-path" data-testid="asaas-webhook-path">
          {data.caminhoWebhook}
        </code>
        <p>
          {t(
            'Selecione os eventos de cobranças (PAYMENT_*), com envio sequencial, e use o mesmo token salvo na aba Credenciais. O Asaas precisa conseguir acessar essa URL pela internet.',
          )}
        </p>
        <dl className="integration-status">
          <div>
            <dt>{t('Token do webhook')}</dt>
            <dd>{t(data.possuiTokenWebhook ? 'Salvo' : 'Não informado')}</dd>
          </div>
          <div>
            <dt>{t('Ambiente')}</dt>
            <dd>{environmentLabel(data.ambiente)}</dd>
          </div>
        </dl>
        <div className="integration-actions">
          <Button variant="secondary" onClick={() => goTo('credenciais')}>
            {t(
              data.possuiTokenWebhook
                ? 'Trocar token em Credenciais'
                : 'Definir token em Credenciais',
            )}
          </Button>
          <small>{t('A chave de API e o token são salvos juntos, como o Asaas exige.')}</small>
        </div>
      </>
    );
  if (tab === 'status')
    return (
      <StatusSummary
        active={data.disponivel ?? data.ativo}
        updatedAt={data.atualizadoEm}
        rows={[
          {
            label: 'Ambiente em uso',
            value: environmentLabel(data.ambienteEfetivo ?? data.ambiente),
          },
          { label: 'Chave de API', value: t(data.possuiChaveApi ? 'Salva' : 'Não informada') },
          {
            label: 'Token do webhook',
            value: t(data.possuiTokenWebhook ? 'Salvo' : 'Não informado'),
          },
        ]}
      >
        <ConnectionTest enabled={data.disponivel ?? data.possuiChaveApi} />
      </StatusSummary>
    );
  return (
    <IntegrationForm
      slug="asaas"
      form={credentialsForm(data)}
      formKey={formKey}
      submitLabel={t('Salvar credenciais')}
      success={t('Credenciais do Asaas salvas.')}
    />
  );
}

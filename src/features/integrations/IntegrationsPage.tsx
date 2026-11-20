import { useI18n } from '../../i18n';
import { OrigemIntegracoesControle } from './OrigemIntegracoes';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useAuthStore, sessionScope } from '../../stores/authStore';
import { StatusBadge } from '../../ui';
import { integrations, type BaseConfiguration, type IntegrationDefinition } from './catalog';
import { useIntegration } from './hooks';
import { ActiveBadge } from './StatusSummary';

function IntegrationCard({ def }: { def: IntegrationDefinition }) {
  const { t } = useI18n();
  const { query } = useIntegration<BaseConfiguration>(def.slug);
  const Icon = def.icon;
  return (
    <Link
      to={`/integracoes/${def.slug}`}
      className="integration-card"
      data-testid={`integration-card-${def.slug}`}
    >
      <div className="integration-card-head">
        <span className="integration-icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <h3>{t(def.title)}</h3>
        {query.data ? (
          <ActiveBadge active={query.data.disponivel ?? query.data.ativo} />
        ) : query.isError ? (
          <StatusBadge status="ERRO" label={t('Indisponível')} />
        ) : (
          <StatusBadge status="CARREGANDO" label={t('Verificando…')} />
        )}
      </div>
      <p className="integration-card-text">{t(def.summary)}</p>
      {query.data?.origem === 'PLATAFORMA' && <p>{t('Usando a integração da plataforma')}</p>}
      <span className="integration-card-cta" aria-hidden="true">
        {t('Configurar')} <ChevronRight size={14} />
      </span>
    </Link>
  );
}

/** Hub de integrações: um card por serviço; os formulários ficam na tela de cada um. */
export function IntegrationsPage() {
  const { t } = useI18n();
  const scope = useAuthStore((s) => sessionScope(s.session));
  return (
    <>
      <PageHeader
        eyebrow={t('CONFIGURAÇÕES')}
        title={t('Integrações')}
        description={t('Configure os serviços utilizados pelo seu estabelecimento.')}
      />
      <p className="notice">
        {t(
          'As credenciais ficam protegidas. Salvar não realiza consultas nem gera cobrança. Para trocar uma credencial, informe a nova no campo correspondente.',
        )}
      </p>
      <OrigemIntegracoesControle />
      <div className="section-label">
        <h2>
          {t('Serviços disponíveis')}{' '}
          <span className="integration-count">({integrations.length})</span>
        </h2>
      </div>
      <ul className="integration-hub" key={scope} data-testid="integration-hub">
        {integrations.map((def) => (
          <li key={def.slug}>
            <IntegrationCard def={def} />
          </li>
        ))}
      </ul>
    </>
  );
}

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
        <h3>{def.title}</h3>
        {query.data ? (
          <ActiveBadge active={query.data.disponivel ?? query.data.ativo} />
        ) : query.isError ? (
          <StatusBadge status="ERRO" label="Indisponível" />
        ) : (
          <StatusBadge status="CARREGANDO" label="Verificando…" />
        )}
      </div>
      <p className="integration-card-text">{def.summary}</p>
      {query.data?.origem === 'PLATAFORMA' && <p>Usando a integração da plataforma</p>}
      <span className="integration-card-cta" aria-hidden="true">
        Configurar <ChevronRight size={14} />
      </span>
    </Link>
  );
}

/** Hub de integrações: um card por serviço; os formulários ficam na tela de cada um. */
export function IntegrationsPage() {
  const scope = useAuthStore((s) => sessionScope(s.session));
  return (
    <>
      <PageHeader
        eyebrow="CONFIGURAÇÕES"
        title="Integrações"
        description="Configure os serviços utilizados pelo seu estabelecimento."
      />
      <p className="notice">
        As credenciais ficam protegidas. Salvar não realiza consultas nem gera cobrança. Para trocar
        uma credencial, informe a nova no campo correspondente.
      </p>
      <OrigemIntegracoesControle />
      <div className="section-label">
        <h2>
          Serviços disponíveis <span className="integration-count">({integrations.length})</span>
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

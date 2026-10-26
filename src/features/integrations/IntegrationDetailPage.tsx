import { OrigemIntegracoesControle } from './OrigemIntegracoes';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { QueryError } from '../../components/QueryError';
import { Skeleton, Tabs, tabIds } from '../../ui';
import {
  findIntegration,
  resolveTab,
  tabMeta,
  type BaseConfiguration,
  type IntegrationDefinition,
  type IntegrationTab,
} from './catalog';
import { useIntegration } from './hooks';
import { ActiveBadge } from './StatusSummary';
import { KeyedTab } from './KeyedPanel';
import { AsaasTab, type AsaasConfiguration } from './AsaasPanel';
import type { KeyedConfiguration } from './keyedSchema';

/** /integracoes/:integracao?tab=credenciais — uma integração por vez, uma aba por vez. */
export function IntegrationDetailPage() {
  const { integracao } = useParams();
  const def = findIntegration(integracao);
  if (!def) return <Navigate to="/integracoes" replace />;
  return <IntegrationDetail key={def.slug} def={def} />;
}

function IntegrationDetail({ def }: { def: IntegrationDefinition }) {
  const [params, setParams] = useSearchParams();
  const tab = resolveTab(def, params.get('tab'));
  const goTo = (next: IntegrationTab) => setParams({ tab: next }, { replace: true });
  const { scope, query } = useIntegration<BaseConfiguration>(def.slug);
  const Icon = def.icon;
  const prefix = 'integration-' + def.slug;
  const ids = tabIds(prefix, tab);
  // Atalhos dentro do painel levam o foco para a aba aberta, não para um botão removido.
  const openTab = (next: IntegrationTab) => {
    goTo(next);
    requestAnimationFrame(() => document.getElementById(tabIds(prefix, next).tab)?.focus());
  };
  // A aba faz parte da chave: trocar de aba descarta o rascunho da aba anterior.
  const formKey = `${scope}:${query.data?.versao ?? 'new'}:${tab}`;
  return (
    <>
      <Link to="/integracoes" className="back-link" data-testid="integrations-back">
        <ArrowLeft size={16} aria-hidden="true" />
        Integrações
      </Link>
      <header className="integration-header" data-testid="integration-header">
        <span className="integration-icon" aria-hidden="true">
          <Icon size={28} />
        </span>
        <div>
          <p className="eyebrow">INTEGRAÇÕES</p>
          <h1 data-testid="page-title">{def.title}</h1>
          <p className="page-description">{def.description}</p>
        </div>
        {query.data && <ActiveBadge active={query.data.disponivel ?? query.data.ativo} />}
      </header>
      <OrigemIntegracoesControle />
      <p className="notice" data-testid="integration-origin">
        {query.data?.origem === 'PLATAFORMA'
          ? `Usando a integração da plataforma.${def.slug === 'asaas' ? ' Os recebimentos ficam na conta da plataforma; o repasse é realizado pela gestão.' : ''}`
          : query.data?.origem === 'PROPRIA' && query.data?.disponivel
            ? 'Usando a integração própria do estabelecimento.'
            : 'Nenhuma integração disponível no momento.'}{' '}
        {def.slug === 'asaas' && query.data?.ambienteEfetivo === 'PRODUCAO' && (
          <strong>Ambiente em produção: cobranças reais. </strong>
        )}
        Para usar credenciais próprias, configure e ative esta integração.
      </p>
      <section
        className="panel integration-panel"
        data-testid={`integration-${def.slug}`}
        aria-label={def.title}
      >
        <Tabs
          label={`Seções de ${def.title}`}
          idPrefix={prefix}
          value={tab}
          onChange={(next) => goTo(next as IntegrationTab)}
          items={def.tabs.map((id) => {
            const meta = tabMeta[id];
            const TabIcon = meta.icon;
            return { id, label: meta.label, icon: <TabIcon size={16} /> };
          })}
        />
        <div
          className="integration-body"
          role="tabpanel"
          id={ids.panel}
          aria-labelledby={ids.tab}
          tabIndex={0}
        >
          {query.isPending ? (
            <Skeleton />
          ) : query.isError ? (
            <QueryError
              error={query.error}
              what={`a integração ${def.title}`}
              onRetry={() => void query.refetch()}
            />
          ) : def.slug === 'asaas' ? (
            <AsaasTab
              tab={tab}
              data={query.data as AsaasConfiguration}
              formKey={formKey}
              goTo={openTab}
            />
          ) : (
            <KeyedTab
              slug={def.slug}
              tab={tab}
              data={query.data as KeyedConfiguration}
              formKey={formKey}
            />
          )}
        </div>
      </section>
    </>
  );
}

import { Component, type ReactNode } from 'react';
import { Button } from '../ui';
import { useI18n } from '../i18n';
function FatalError() {
  const { t } = useI18n();
  return (
    <main className="fatal-error">
      <h1>{t('Não foi possível abrir esta tela')}</h1>
      <p>{t('Recarregue a página para tentar novamente.')}</p>
      <Button data-testid="reload" onClick={() => location.reload()}>
        {t('Recarregar')}
      </Button>
    </main>
  );
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <FatalError /> : this.props.children;
  }
}

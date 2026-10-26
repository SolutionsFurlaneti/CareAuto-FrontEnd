import { Component, type ReactNode } from 'react';
import { Button } from '../ui';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-error">
        <h1>Não foi possível abrir esta tela</h1>
        <p>Recarregue a página para tentar novamente.</p>
        <Button data-testid="reload" onClick={() => location.reload()}>
          Recarregar
        </Button>
      </main>
    ) : (
      this.props.children
    );
  }
}

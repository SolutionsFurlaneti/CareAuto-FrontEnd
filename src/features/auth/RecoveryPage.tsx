import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RecordForm } from '../../components/RecordForm';
import { api } from '../../lib/apiClient';
import { recoverySchema } from './authSchema';

export function RecoveryPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <main className="account-page">
      <section className="panel account-panel">
        <p className="eyebrow">AUTOCARE</p>
        <h1>Esqueceu sua senha?</h1>
        <p>
          Informe o e-mail usado para entrar. Você receberá uma senha provisória e criará sua
          própria senha no próximo acesso.
        </p>
        {sent ? (
          <p role="status" className="notice">
            Se houver uma conta ativa com este e-mail, você receberá uma senha provisória válida por
            30 minutos. Confira também o spam. Se precisar solicitar novamente, aguarde 5 minutos.
          </p>
        ) : (
          <RecordForm
            submitLabel="Enviar senha provisória"
            spec={{
              schema: recoverySchema,
              defaults: { email: '' },
              fields: [{ name: 'email', label: 'E-mail cadastrado', kind: 'email' }],
            }}
            error={error}
            onSubmit={async (values) => {
              setError(undefined);
              try {
                await api('/api/v1/auth/recuperar-senha', {
                  method: 'POST',
                  auth: 'none',
                  body: JSON.stringify(values),
                });
                setSent(true);
              } catch (e) {
                setError(e);
              }
            }}
          />
        )}
        <Link to="/login" className="text-link" data-testid="recovery-login">
          Voltar para entrar
        </Link>
      </section>
    </main>
  );
}

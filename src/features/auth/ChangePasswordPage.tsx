import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RecordForm } from '../../components/RecordForm';
import { Button } from '../../ui';
import { useAuthStore } from '../../stores/authStore';
import { savePasswordSession, signOut } from './api';
import { changePasswordSchema } from './authSchema';
export function ChangePasswordPage() {
  const session = useAuthStore((s) => s.session);
  const [error, setError] = useState<unknown>();
  const navigate = useNavigate();
  return (
    <main className="account-page">
      <section className="panel account-panel">
        <p className="eyebrow">SUA CONTA</p>
        <h1>{session?.mustChangePassword ? 'Crie sua senha pessoal.' : 'Alterar senha'}</h1>
        <p className="muted">
          {session?.mustChangePassword
            ? 'Para acessar o sistema, substitua a senha provisória recebida.'
            : 'A troca encerra suas outras sessões.'}
        </p>
        <RecordForm
          submitLabel="Atualizar senha"
          spec={{
            schema: changePasswordSchema,
            defaults: { senhaAtual: '', novaSenha: '', confirmarSenha: '' },
            fields: [
              { name: 'senhaAtual', label: 'Senha atual', kind: 'password' },
              {
                name: 'novaSenha',
                label: 'Nova senha',
                kind: 'password',
                hint: 'Pelo menos 6 caracteres.',
              },
              { name: 'confirmarSenha', label: 'Confirmar nova senha', kind: 'password' },
            ],
          }}
          error={error}
          onSubmit={async (values) => {
            setError(undefined);
            try {
              await savePasswordSession('trocar-senha', {
                senhaAtual: values.senhaAtual,
                novaSenha: values.novaSenha,
              });
              navigate('/', { replace: true });
            } catch (e) {
              setError(e);
            }
          }}
        />
        <div className="page-actions">
          {!session?.mustChangePassword && (
            <Link data-testid="password-back" className="text-link" to="/">
              Voltar
            </Link>
          )}
          <Button
            data-testid="password-logout"
            variant="ghost"
            onClick={async () => {
              try {
                await signOut();
              } catch {
                /* Local session is already cleared. */
              } finally {
                navigate('/login', { replace: true });
              }
            }}
          >
            Sair da conta
          </Button>
        </div>
      </section>
    </main>
  );
}

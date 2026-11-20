import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { RecordForm } from '../../components/RecordForm';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useI18n } from '../../i18n';
import { Button } from '../../ui';
import { useAuthStore } from '../../stores/authStore';
import { savePasswordSession, signOut } from './api';
import { changePasswordSchema } from './authSchema';
export function ChangePasswordPage() {
  const { t } = useI18n();
  const session = useAuthStore((s) => s.session);
  const [error, setError] = useState<unknown>();
  const navigate = useNavigate();
  return (
    <main className="account-page">
      <section className="panel account-panel">
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <LanguageSelector />
        </Box>
        <p className="eyebrow">{t('SUA CONTA')}</p>
        <h1>{t(session?.mustChangePassword ? 'Crie sua senha pessoal.' : 'Alterar senha')}</h1>
        <p className="muted">
          {t(
            session?.mustChangePassword
              ? 'Para acessar o sistema, substitua a senha provisória recebida.'
              : 'A troca encerra suas outras sessões.',
          )}
        </p>
        <RecordForm
          submitLabel={t('Atualizar senha')}
          spec={{
            schema: changePasswordSchema,
            defaults: { senhaAtual: '', novaSenha: '', confirmarSenha: '' },
            fields: [
              { name: 'senhaAtual', label: t('Senha atual'), kind: 'password' },
              {
                name: 'novaSenha',
                label: t('Nova senha'),
                kind: 'password',
                hint: t('Pelo menos 6 caracteres.'),
              },
              { name: 'confirmarSenha', label: t('Confirmar nova senha'), kind: 'password' },
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
              navigate('/visao-geral', { replace: true });
            } catch (e) {
              setError(e);
            }
          }}
        />
        <div className="page-actions">
          {!session?.mustChangePassword && (
            <Link data-testid="password-back" className="text-link" to="/visao-geral">
              {t('Voltar')}
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
            {t('Sair da conta')}
          </Button>
        </div>
      </section>
    </main>
  );
}

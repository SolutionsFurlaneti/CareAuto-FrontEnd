import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box } from '@mui/material';
import { RecordForm } from '../../components/RecordForm';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useI18n } from '../../i18n';
import { api } from '../../lib/apiClient';
import { recoverySchema } from './authSchema';

export function RecoveryPage() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <main className="account-page">
      <section className="panel account-panel">
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <LanguageSelector />
        </Box>
        <p className="eyebrow">CAREAUTO</p>
        <h1>{t('Esqueceu sua senha?')}</h1>
        <p>
          {t(
            'Informe o e-mail usado para entrar. Você receberá uma senha provisória e criará sua própria senha no próximo acesso.',
          )}
        </p>
        {sent ? (
          <p role="status" className="notice">
            {t(
              'Se houver uma conta ativa com este e-mail, você receberá uma senha provisória válida por 30 minutos. Confira também o spam. Se precisar solicitar novamente, aguarde 5 minutos.',
            )}
          </p>
        ) : (
          <RecordForm
            submitLabel={t('Enviar senha provisória')}
            spec={{
              schema: recoverySchema,
              defaults: { email: '' },
              fields: [{ name: 'email', label: t('E-mail cadastrado'), kind: 'email' }],
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
          {t('Voltar para entrar')}
        </Link>
      </section>
    </main>
  );
}

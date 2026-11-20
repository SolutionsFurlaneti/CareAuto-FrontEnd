import { useI18n } from '../../i18n';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, ShieldCheck } from 'lucide-react';
import { Button, Field } from '../../ui';
import { ThemeToggle } from '../../components/ThemeToggle';
import { describeError } from '../../lib/describeError';
import { isBackofficeSessionValid, useBackofficeStore } from './store';
import { loginBackoffice } from './api';
import { LanguageSelector } from '../../components/LanguageSelector';

const schema = z.object({
  login: z.string().trim().min(1, 'Informe o login.').max(50),
  senha: z.string().min(1, 'Informe a senha.').max(128),
});
type Data = z.infer<typeof schema>;

export function BackofficeLoginPage() {
  const { t } = useI18n();
  const session = useBackofficeStore((s) => s.session);
  const [error, setError] = useState<unknown>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Data>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { login: '', senha: '' },
  });
  useEffect(() => {
    if (session && !isBackofficeSessionValid(session)) useBackofficeStore.getState().clear();
  }, [session]);
  if (isBackofficeSessionValid(session))
    return (
      <Navigate
        to={session.mustChangePassword ? '/backoffice/trocar-senha' : '/backoffice'}
        replace
      />
    );
  return (
    <main className="login-page backoffice-login">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <section className="login-story">
        <div className="login-brand-row">
          <span className="brand">
            <span className="brand-symbol">
              <Building2 size={25} />
            </span>
            <span>CareAuto Backoffice</span>
          </span>
          <LanguageSelector />
        </div>
        <p className="eyebrow">{t('GESTÃO DA PLATAFORMA')}</p>
        <h1>
          {t('Assinantes, planos')} <br />
          {t('e crescimento')} <br />
          <em>{t('em um só lugar.')}</em>
        </h1>
        <p>
          {t(
            'Acompanhe os estacionamentos assinantes, a cobrança das mensalidades e as campanhas de aquisição.',
          )}{' '}
        </p>
      </section>
      <section className="login-card">
        <span className="login-lock">
          <ShieldCheck size={24} />
        </span>
        <p className="eyebrow">{t('ACESSO RESTRITO')}</p>
        <h2>{t('Entrar no backoffice')}</h2>
        <p>{t('Área da equipe CareAuto. Estacionamentos entram pelo login principal.')}</p>
        <form
          noValidate
          className="form-grid single"
          data-testid="backoffice-login-form"
          onSubmit={handleSubmit(async (values) => {
            setError(undefined);
            try {
              useBackofficeStore
                .getState()
                .setSession(await loginBackoffice(values.login, values.senha));
            } catch (e) {
              setError(e);
            }
          })}
        >
          <Field
            label={t('Login')}
            autoComplete="username"
            data-testid="bo-login"
            {...register('login')}
            error={errors.login?.message ? t(errors.login.message) : undefined}
          />
          <Field
            label={t('Senha')}
            type="password"
            autoComplete="current-password"
            data-testid="bo-senha"
            {...register('senha')}
            error={errors.senha?.message ? t(errors.senha.message) : undefined}
          />
          {!!error && (
            <p className="field-error" role="alert" data-testid="bo-login-error">
              {describeError(error)}
            </p>
          )}
          <Button type="submit" busy={isSubmitting} data-testid="bo-login-submit">
            {t('Entrar')}{' '}
          </Button>
        </form>
      </section>
    </main>
  );
}

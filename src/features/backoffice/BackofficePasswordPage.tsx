import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field } from '../../ui';
import { describeError } from '../../lib/describeError';
import { useBackofficeStore } from './store';
import { sairBackoffice, trocarSenhaBackoffice } from './api';

const schema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual.').max(128),
    novaSenha: z
      .string()
      .min(8, 'Use pelo menos 8 caracteres.')
      .max(128, 'Use até 128 caracteres.'),
    confirmarSenha: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.novaSenha === '123456')
      ctx.addIssue({
        code: 'custom',
        path: ['novaSenha'],
        message: 'Escolha uma senha diferente da senha inicial.',
      });
    if (v.novaSenha === v.senhaAtual)
      ctx.addIssue({
        code: 'custom',
        path: ['novaSenha'],
        message: 'A nova senha deve ser diferente da atual.',
      });
    if (v.novaSenha !== v.confirmarSenha)
      ctx.addIssue({
        code: 'custom',
        path: ['confirmarSenha'],
        message: 'As senhas precisam ser iguais.',
      });
  });
type Data = z.infer<typeof schema>;

export async function sairDoBackoffice() {
  try {
    await sairBackoffice();
  } catch {
    /* A sessão local é encerrada de qualquer forma. */
  } finally {
    useBackofficeStore.getState().clear();
  }
}

export function BackofficePasswordPage() {
  const session = useBackofficeStore((s) => s.session);
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Data>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { senhaAtual: '', novaSenha: '', confirmarSenha: '' },
  });
  const obrigatoria = !!session?.mustChangePassword;
  return (
    <main className="account-page">
      <section className="panel account-panel">
        <p className="eyebrow">BACKOFFICE · {session?.login}</p>
        <h1>{obrigatoria ? 'Defina uma nova senha.' : 'Alterar senha'}</h1>
        <p className="muted">
          {obrigatoria
            ? 'O acesso inicial usa a senha padrão. Troque-a agora para usar o backoffice.'
            : 'A troca encerra suas outras sessões no backoffice.'}
        </p>
        <form
          noValidate
          className="form-grid single"
          data-testid="bo-password-form"
          onSubmit={handleSubmit(async (values) => {
            setError(undefined);
            try {
              useBackofficeStore
                .getState()
                .setSession(await trocarSenhaBackoffice(values.senhaAtual, values.novaSenha));
              navigate('/backoffice', { replace: true });
            } catch (e) {
              setError(e);
            }
          })}
        >
          <Field
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            data-testid="bo-senha-atual"
            {...register('senhaAtual')}
            error={errors.senhaAtual?.message}
          />
          <Field
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            hint="Pelo menos 8 caracteres."
            data-testid="bo-nova-senha"
            {...register('novaSenha')}
            error={errors.novaSenha?.message}
          />
          <Field
            label="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            data-testid="bo-confirmar-senha"
            {...register('confirmarSenha')}
            error={errors.confirmarSenha?.message}
          />
          {!!error && (
            <p className="field-error" role="alert">
              {describeError(error)}
            </p>
          )}
          <Button type="submit" busy={isSubmitting} data-testid="bo-password-submit">
            Salvar nova senha
          </Button>
        </form>
        <div className="page-actions">
          {!obrigatoria && (
            <Link className="text-link" to="/backoffice">
              Voltar
            </Link>
          )}
          <Button
            variant="ghost"
            data-testid="bo-password-logout"
            onClick={async () => {
              await sairDoBackoffice();
              navigate('/backoffice/login', { replace: true });
            }}
          >
            Sair
          </Button>
        </div>
      </section>
    </main>
  );
}

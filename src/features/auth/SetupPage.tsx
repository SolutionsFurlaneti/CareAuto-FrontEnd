import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RecordForm } from '../../components/RecordForm';
import { QueryError } from '../../components/QueryError';
import { Skeleton, Switch } from '../../ui';
import { getAuthConfiguration, savePasswordSession } from './api';
import { setupSchema } from './authSchema';
import { isSessionValid, useAuthStore } from '../../stores/authStore';
export function SetupPage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const [error, setError] = useState<unknown>();
  const [consentimentoPublicidade, setConsentimentoPublicidade] = useState(false);
  const config = useQuery({
    queryKey: ['auth-config', session?.userId ?? null],
    queryFn: ({ signal }) => getAuthConfiguration(signal),
  });
  if (isSessionValid(session)) return <Navigate to="/" replace />;
  if (config.isPending) return <Skeleton />;
  if (config.isError)
    return (
      <QueryError
        error={config.error}
        what="a configuração de acesso"
        onRetry={() => void config.refetch()}
      />
    );
  if (!config.data.registrationEnabled || config.data.mode !== 'Internal')
    return <Navigate to="/login" replace />;
  return (
    <main className="account-page">
      <section className="panel account-panel">
        <p className="eyebrow">NOVO ESTABELECIMENTO</p>
        <h1>Seu estacionamento começa aqui.</h1>
        <p className="muted">
          Cadastre seu estabelecimento e a conta do dono. Seus clientes, preços e funcionários ficam
          separados dos demais estabelecimentos.
        </p>
        <RecordForm
          submitLabel="Criar minha conta"
          spec={{
            schema: setupSchema,
            defaults: {
              estacionamento: '',
              tipoPessoa: 'PJ',
              documento: '',
              nome: '',
              email: '',
              telefone: '',
              senha: '',
              confirmarSenha: '',
            },
            fields: [
              { name: 'estacionamento', label: 'Nome do estacionamento' },
              {
                name: 'tipoPessoa',
                label: 'Tipo de pessoa',
                kind: 'select',
                options: [
                  { value: 'PJ', label: 'Pessoa jurídica' },
                  { value: 'PF', label: 'Pessoa física' },
                ],
              },
              { name: 'documento', label: 'CNPJ ou CPF', hint: 'Somente dígitos.' },
              { name: 'nome', label: 'Nome do dono' },
              { name: 'email', label: 'E-mail de acesso', kind: 'email' },
              {
                name: 'telefone',
                label: 'Telefone com DDD (opcional)',
                kind: 'tel',
                optional: true,
                autoComplete: 'tel',
                hint: 'Ex.: (11) 99999-9999.',
              },
              {
                name: 'senha',
                label: 'Senha',
                kind: 'password',
                hint: 'Pelo menos 6 caracteres.',
              },
              { name: 'confirmarSenha', label: 'Confirmar senha', kind: 'password' },
            ],
          }}
          error={error}
          onSubmit={async (values) => {
            setError(undefined);
            const data: Record<string, unknown> = {
              ...values,
              telefone: consentimentoPublicidade ? values.telefone : null,
              consentimentoDadosPublicidade: consentimentoPublicidade,
            };
            delete data.confirmarSenha;
            const parametros = new URLSearchParams(window.location.search);
            const idClique = (chave: string) => {
              const valor = parametros.get(chave)?.trim();
              return consentimentoPublicidade && valor ? valor.slice(0, 500) : null;
            };
            data.googleClickId = idClique('gclid');
            data.googleBraidId = idClique('gbraid');
            data.googleWebBraidId = idClique('wbraid');
            const metaClickId = idClique('fbclid');
            const metaBrowserId = consentimentoPublicidade
              ? (document.cookie
                  .split('; ')
                  .find((cookie) => cookie.startsWith('_fbp='))
                  ?.slice(5)
                  .slice(0, 500) ?? null)
              : null;
            data.metaClickId = metaClickId;
            data.metaBrowserId = metaBrowserId;
            try {
              await savePasswordSession('configuracao-inicial', data);
              navigate('/', { replace: true });
            } catch (e) {
              setError(e);
            }
          }}
        >
          <div className="form-span">
            <Switch
              checked={consentimentoPublicidade}
              onChange={setConsentimentoPublicidade}
              label="Autorizo a medição de conversões do Google Ads e Meta Ads"
              description="Opcional. Se aceitar, o e-mail e o telefone informado serão enviados em formato hash, junto dos identificadores de anúncio disponíveis, para medir cadastros de teste e assinaturas."
              data-testid="setup-google-ads-consent"
            />
          </div>
        </RecordForm>
        <Link className="text-link" data-testid="back-login" to="/login">
          Voltar para entrar
        </Link>
      </section>
    </main>
  );
}

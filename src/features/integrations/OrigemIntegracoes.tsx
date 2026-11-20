import { useI18n } from '../../i18n';
export function OrigemIntegracoesControle() {
  const { t } = useI18n();
  return (
    <div className="notice" data-testid="integration-credential-rule">
      {t(
        'Credenciais próprias preenchidas e ativas têm prioridade. Quando não houver uma credencial própria ativa, o serviço usa a configuração ativa do backoffice. Se nenhuma estiver disponível, configure a integração antes de usar.',
      )}
      <p>{t('Recebimentos Asaas pela plataforma ficam sujeitos ao repasse pela gestão.')}</p>
    </div>
  );
}

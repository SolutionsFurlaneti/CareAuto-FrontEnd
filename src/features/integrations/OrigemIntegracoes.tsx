export function OrigemIntegracoesControle() {
  return (
    <div className="notice" data-testid="integration-credential-rule">
      Credenciais próprias preenchidas e ativas têm prioridade. Quando não houver uma credencial
      própria ativa, o serviço usa a configuração ativa do backoffice. Se nenhuma estiver
      disponível, configure a integração antes de usar.
      <p>Recebimentos Asaas pela plataforma ficam sujeitos ao repasse pela gestão.</p>
    </div>
  );
}

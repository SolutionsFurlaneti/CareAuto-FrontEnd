/** Integrations, printing, vehicle inspections and payment interface copy. */
export const configurationEnglish: Record<string, string> = {
  Claude: 'Claude',
  Asaas: 'Asaas',
  Telefone: 'Phone',
  Observações: 'Notes',
  Copiar: 'Copy',
  'Produção — cobranças reais': 'Production — real charges',
  'Sandbox — testes': 'Sandbox — tests',
  'Sandbox — teste': 'Sandbox — test',
  'Asaas — produção': 'Asaas — production',
  'Integração própria': 'Your own integration',
  Ativada: 'Enabled',
  Desativada: 'Disabled',
  'Ative a integração própria para dar prioridade à sua conta; sem chave própria ativa, usa o backoffice. Cobranças antigas mantêm a conta de origem.':
    'Enable your own integration to prioritize your account. Without an active personal credential, the platform configuration is used. Existing charges keep their original account.',
  Ambiente: 'Environment',
  'Nova chave de API': 'New API key',
  'Chave salva: ••••••••. Vazio mantém a atual.':
    'Saved key: ••••••••. Leave blank to keep the current key.',
  'Crie a chave na conta Asaas do ambiente selecionado.':
    'Create the key in the Asaas account for the selected environment.',
  'Novo token do webhook': 'New webhook token',
  'Token salvo: ••••••••. Vazio mantém o atual.':
    'Saved token: ••••••••. Leave blank to keep the current token.',
  'Defina um token aleatório de 32 a 255 caracteres e use o mesmo no painel Asaas.':
    'Set a random token of 32 to 255 characters and use the same token in the Asaas dashboard.',
  'Credenciais salvas': 'Saved credentials',
  'Manter (ou substituir pelas novas)': 'Keep (or replace with the new ones)',
  'Remover e manter desativada': 'Remove and keep disabled',
  'Conexão com o Asaas confirmada. Nenhuma cobrança foi criada.':
    'Asaas connection confirmed. No charge was created.',
  'Testar conexão salva': 'Test saved connection',
  'Salve uma chave de API na aba Credenciais para testar.':
    'Save an API key in the Credentials tab to test the connection.',
  'O webhook é configurado pela gestão da plataforma. Para usar sua própria conta Asaas, configure as credenciais do estabelecimento.':
    'The platform administrator configures the webhook. To use your own Asaas account, set up your business credentials.',
  'Cadastre um webhook no Asaas com a URL pública HTTPS do backend, seguida deste caminho:':
    'Create an Asaas webhook using the public HTTPS backend URL followed by this path:',
  'Selecione os eventos de cobranças (PAYMENT_*), com envio sequencial, e use o mesmo token salvo na aba Credenciais. O Asaas precisa conseguir acessar essa URL pela internet.':
    'Select payment events (PAYMENT_*) with sequential delivery and use the same token saved in the Credentials tab. Asaas must be able to reach this URL over the internet.',
  'Token do webhook': 'Webhook token',
  Salvo: 'Saved',
  Salva: 'Saved',
  'Não informado': 'Not provided',
  'Não informada': 'Not provided',
  'Trocar token em Credenciais': 'Change token in Credentials',
  'Definir token em Credenciais': 'Set token in Credentials',
  'A chave de API e o token são salvos juntos, como o Asaas exige.':
    'The API key and token are saved together, as required by Asaas.',
  'Ambiente em uso': 'Current environment',
  'Chave de API': 'API key',
  'Salvar credenciais': 'Save credentials',
  'Credenciais do Asaas salvas.': 'Asaas credentials saved.',
  'Use de 32 a 255 caracteres, sem espaços.': 'Use 32 to 255 characters without spaces.',
  'Desative e deixe as novas credenciais vazias para remover.':
    'Disable the integration and leave the new credentials blank to remove them.',
  'Ao trocar o ambiente, informe a chave do novo ambiente.':
    'When changing environments, enter the key for the new environment.',
  'Ao trocar o ambiente, informe o token do webhook do novo ambiente.':
    'When changing environments, enter the webhook token for the new environment.',
  'Informe a chave de API para ativar.': 'Enter the API key to enable the integration.',
  'Informe o token do webhook para ativar.': 'Enter the webhook token to enable the integration.',
  Credenciais: 'Credentials',
  Configurações: 'Settings',
  Webhooks: 'Webhooks',
  Status: 'Status',
  'Leitura automática da placa nas fotos com inteligência artificial.':
    'Automatic license plate reading from photos using AI.',
  'Leitura automática da placa nas fotos. O uso é cobrado pela Anthropic.':
    'Automatic license plate reading from photos. Anthropic charges for usage.',
  'Consulta de placas': 'License plate lookup',
  'Marca, modelo, cor e situação do veículo a partir da placa.':
    'Vehicle make, model, color and status from the license plate.',
  'Preenchimento de marca, modelo, cor e situação. Requer consultas disponíveis no provedor.':
    'Fill in the make, model, color and status. Requires available lookups with the provider.',
  'Cobranças por Pix, boleto e cartão, com conciliação por webhook.':
    'Charges by Pix, boleto and card, with webhook reconciliation.',
  'Emita Pix, boleto ou uma fatura para pagamento com cartão. Comece pelo Sandbox para testar sem movimentar dinheiro.':
    'Issue a Pix charge, boleto or card payment invoice. Start in Sandbox to test without moving real money.',
  Integrações: 'Integrations',
  INTEGRAÇÕES: 'INTEGRATIONS',
  'Usando a integração da plataforma.': 'Using the platform integration.',
  'Usando a integração da plataforma': 'Using the platform integration',
  'Os recebimentos ficam na conta da plataforma; o repasse é realizado pela gestão.':
    'Payments are received in the platform account; the administrator handles transfers.',
  'Usando a integração própria do estabelecimento.': 'Using the business’s own integration.',
  'Nenhuma integração disponível no momento.': 'No integration is currently available.',
  'Ambiente em produção: cobranças reais.': 'Production environment: real charges.',
  'Para usar credenciais próprias, configure e ative esta integração.':
    'To use your own credentials, configure and enable this integration.',
  'Seções de {name}': '{name} sections',
  'a integração {name}': 'the {name} integration',
  Indisponível: 'Unavailable',
  'Verificando…': 'Checking…',
  Configurar: 'Configure',
  CONFIGURAÇÕES: 'SETTINGS',
  'Configure os serviços utilizados pelo seu estabelecimento.':
    'Configure the services used by your business.',
  'As credenciais ficam protegidas. Salvar não realiza consultas nem gera cobrança. Para trocar uma credencial, informe a nova no campo correspondente.':
    'Your credentials are protected. Saving does not perform lookups or create charges. To change a credential, enter the new one in its field.',
  'Serviços disponíveis': 'Available services',
  'Integração salva. A próxima consulta usará esta configuração.':
    'Integration saved. The next lookup will use these settings.',
  'Salvar configurações': 'Save settings',
  'Nome da chave': 'Key name',
  Modelo: 'Model',
  Provedor: 'Provider',
  'Informe a credencial para ativar a integração.': 'Enter a credential to enable the integration.',
  'Deixe a nova credencial vazia para remover.':
    'Leave the new credential blank to remove the saved one.',
  Integração: 'Integration',
  'Novo token': 'New token',
  'Credencial salva: ••••••••. Deixe vazio para mantê-la.':
    'Saved credential: ••••••••. Leave blank to keep it.',
  'Nenhuma credencial salva.': 'No saved credential.',
  'Credencial salva': 'Saved credential',
  'Manter (ou substituir pela nova)': 'Keep (or replace with the new one)',
  'Endereço da API': 'API address',
  'Endpoint oficial da Anthropic.': 'Official Anthropic endpoint.',
  'Versão da API': 'API version',
  'Formato AAAA-MM-DD.': 'YYYY-MM-DD format.',
  'Máximo de tokens': 'Maximum tokens',
  'Tempo limite (segundos)': 'Timeout (seconds)',
  'URL da consulta': 'Lookup URL',
  'API Placas: mantenha os marcadores {placa} e {token}.':
    'API Placas: keep the {placa} and {token} placeholders.',
  'Credenciais próprias preenchidas e ativas têm prioridade. Quando não houver uma credencial própria ativa, o serviço usa a configuração ativa do backoffice. Se nenhuma estiver disponível, configure a integração antes de usar.':
    'Your own complete, active credentials take priority. Without an active personal credential, the service uses the active platform settings. If neither is available, configure the integration before using it.',
  'Recebimentos Asaas pela plataforma ficam sujeitos ao repasse pela gestão.':
    'Asaas payments received by the platform are transferred by the administrator.',
  'Última alteração': 'Last change',
  'Nunca configurada': 'Never configured',
  'Alterado por': 'Changed by',
  'O código do ticket é inválido para impressão.': 'The ticket code is invalid for printing.',
  'Código do ticket {code}': 'Ticket code {code}',
  'Escolha papel de 58 ou 80 mm para imprimir.': 'Choose 58 or 80 mm paper for printing.',
  'Teste de impressão': 'Print test',
  'Ticket de estacionamento': 'Parking ticket',
  'TESTE DE IMPRESSÃO': 'PRINT TEST',
  ENTRADA: 'CHECK-IN',
  PRINCIPAL: 'MAIN',
  'Tolerância: {minutes} minutos': 'Grace period: {minutes} minutes',
  'Ticket/Seq:': 'Ticket/Seq:',
  'Data/Hora:': 'Date/Time:',
  'O QR Code de teste não representa uma estadia.': 'The test QR code does not represent a stay.',
  'Guarde este ticket para a saída.': 'Keep this ticket for check-out.',
  'Já existe um diálogo de impressão aberto. Feche-o e tente novamente.':
    'A print dialog is already open. Close it and try again.',
  'A impressão foi interrompida ao sair da página.':
    'Printing was interrupted when leaving the page.',
  'Não foi possível abrir a impressão no navegador.': 'Unable to open browser printing.',
  'O ticket não carregou para impressão. Tente novamente.':
    'The ticket did not load for printing. Try again.',
  'Documento de impressão do ticket': 'Printable ticket document',
  'Este navegador não disponibilizou a impressão. Use um navegador no computador.':
    'This browser did not provide printing. Use a browser on a computer.',
  'Teste da impressora': 'Printer test',
  'A sessão mudou. Abra a estadia novamente para imprimir.':
    'The session changed. Open the stay again to print.',
  'Abra o CareAuto no navegador do computador para usar esta forma de impressão.':
    'Open CareAuto in your computer’s browser to use this printing method.',
  'Diálogo de impressão aberto. Confirme a impressão na janela do sistema.':
    'Print dialog opened. Confirm printing in the system window.',
  'Ticket enviado para a impressora.': 'Ticket sent to the printer.',
  'Ticket enviado para {count} impressoras.': 'Ticket sent to {count} printers.',
  'Nome da impressora': 'Printer name',
  'Guarita 1': 'Gatehouse 1',
  'Tipo de conexão': 'Connection type',
  'Rede TCP/IP (porta 9100)': 'TCP/IP network (port 9100)',
  'USB (driver do Windows)': 'USB (Windows driver)',
  'POS Android integrado (agente local)': 'Integrated Android POS (local agent)',
  'ID do agente Android': 'Android agent ID',
  'Endereço IP': 'IP address',
  'Nome do driver no Windows': 'Windows driver name',
  'ID exibido no POS Android': 'ID shown on the Android POS',
  'Identificador mostrado em Configurações > Impressão no próprio POS.':
    'Identifier shown under Settings > Printing on the POS itself.',
  'IP fixo da impressora na rede da guarita.':
    'The printer’s static IP address on the gatehouse network.',
  'Nome exato exibido em Configurações do Windows › Impressoras e scanners.':
    'The exact name shown in Windows Settings › Printers & scanners.',
  'Porta TCP': 'TCP port',
  Função: 'Function',
  'Imprime tickets de entrada': 'Prints check-in tickets',
  'Imprime comprovantes de fechamento': 'Prints closing receipts',
  'Usado quando o fechamento passar a ser impresso.':
    'Used when closing receipt printing becomes available.',
  'Impressora ativa': 'Active printer',
  'Informe um nome, como Guarita 1.': 'Enter a name, such as Gatehouse 1.',
  'Nome muito longo.': 'The name is too long.',
  'Preencha este campo.': 'Fill in this field.',
  'Texto muito longo.': 'The text is too long.',
  'Porta entre 1 e 65535.': 'Use a port between 1 and 65535.',
  'Informe o ID do agente Android exibido no terminal POS.':
    'Enter the Android agent ID shown on the POS terminal.',
  'Informe a porta TCP (geralmente 9100).': 'Enter the TCP port (usually 9100).',
  'Informe um IP (ex.: 192.168.0.50) ou nome de rede válido.':
    'Enter an IP address (e.g. 192.168.0.50) or a valid network hostname.',
  'Escolha ao menos uma função: entrada ou fechamento.':
    'Choose at least one function: check-in or closing.',
  'Na fila': 'Queued',
  Imprimindo: 'Printing',
  Impresso: 'Printed',
  Falhou: 'Failed',
  'Preferências de impressão salvas.': 'Printing preferences saved.',
  'Ao registrar uma entrada, o operador escolhe se imprime o ticket.':
    'When recording a check-in, the operator chooses whether to print the ticket.',
  'O diálogo de impressão abre após cada entrada. Confirme a impressão na janela do sistema.':
    'The print dialog opens after each check-in. Confirm printing in the system window.',
  'O ticket é impresso automaticamente em toda entrada.':
    'The ticket is printed automatically for every check-in.',
  'Nenhum ticket é impresso na entrada. O operador ainda pode imprimir pela estadia.':
    'No ticket is printed at check-in. The operator can still print from the stay.',
  'Cadastre e ative uma impressora para habilitar esta opção.':
    'Add and activate a printer to enable this option.',
  'Ao registrar entrada': 'When recording a check-in',
  'Imprimir utilizando o navegador': 'Print using the browser',
  'Disponível ao abrir o CareAuto no navegador do computador.':
    'Available when opening CareAuto in a computer browser.',
  'Abre o diálogo do sistema para escolher sua impressora USB ou de rede. Cada impressão precisa de confirmação.':
    'Opens the system dialog to choose your USB or network printer. Each print requires confirmation.',
  'Largura do papel': 'Paper width',
  '58 mm': '58 mm',
  '80 mm': '80 mm',
  'Perguntar se deseja imprimir na entrada': 'Ask whether to print at check-in',
  'Mostra “Deseja imprimir o ticket de estacionamento?” depois de salvar.':
    'Shows “Would you like to print the parking ticket?” after saving.',
  'Gere o token e instale o agente de impressão para enviar os tickets.':
    'Generate a token and install the print agent to send tickets.',
  'Cadastre e ative uma impressora térmica para habilitar esta opção.':
    'Add and activate a thermal printer to enable this option.',
  'Impressora necessária': 'Printer required',
  'Imprimir automaticamente': 'Print automatically',
  'Abre o diálogo após registrar a entrada. Confirme a impressão na janela do sistema.':
    'Opens the dialog after recording a check-in. Confirm printing in the system window.',
  'Desative a pergunta para imprimir sem confirmação.':
    'Disable the prompt to print without confirmation.',
  'Imprime o ticket sem perguntar.': 'Prints the ticket without prompting.',
  'A impressora está cadastrada. Para os tickets chegarem até ela, gere o token do agente e instale o agente no computador da guarita.':
    'The printer has been added. To receive tickets, generate an agent token and install the agent on the gatehouse computer.',
  'Ao voltar ao agente, os trabalhos pendentes do histórico poderão ser impressos.':
    'When switching back to the agent, pending jobs in the history may be printed.',
  'Salvar preferências': 'Save preferences',
  'Última alteração:': 'Last change:',
  'A sessão mudou. Abra a página novamente para imprimir.':
    'The session changed. Open the page again to print.',
  'Impressão pelo navegador': 'Browser printing',
  'Selecione sua impressora na janela do sistema e confirme a impressão. O ticket usa papel de':
    'Select your printer in the system window and confirm printing. The ticket uses paper that is',
  'mm.': 'mm wide.',
  'Não é necessário configurar token ou agente para este modo. No diálogo, use o tamanho correto da bobina, escala de 100% e desative cabeçalhos e rodapés.':
    'This mode does not require a token or agent. In the dialog, choose the correct paper roll size, use 100% scale and disable headers and footers.',
  'Imprimir teste': 'Print test',
  'Agente de impressão SUNMI iniciado neste terminal.':
    'SUNMI print agent started on this terminal.',
  'Este terminal não foi identificado como compatível com a impressora SUNMI.':
    'This terminal was not identified as compatible with the SUNMI printer.',
  'Gerar novo token?': 'Generate a new token?',
  'Todos os agentes deste estabelecimento deixarão de imprimir até receberem o novo token.':
    'All agents for this business will stop printing until they receive the new token.',
  'Gerar novo token': 'Generate new token',
  'Token copiado.': 'Token copied.',
  'Não foi possível copiar. Selecione o texto e copie manualmente.':
    'Unable to copy. Select the text and copy it manually.',
  'ID do POS copiado.': 'POS ID copied.',
  'Não foi possível copiar o ID. Selecione o texto e copie manualmente.':
    'Unable to copy the ID. Select the text and copy it manually.',
  'Agente de impressão pausado neste terminal.': 'Print agent paused on this terminal.',
  'Agente Android': 'Android agent',
  'Agente de impressão': 'Print agent',
  'Não configurado': 'Not configured',
  Conectado: 'Connected',
  'Ativo no terminal': 'Active on terminal',
  'Sem contato': 'No connection',
  'O agente SUNMI consulta a fila em segundo plano e envia tickets com QR Code à impressora térmica integrada. Compatibilidade automática é habilitada para terminais SUNMI.':
    'The SUNMI agent checks the queue in the background and sends QR code tickets to the integrated thermal printer. Automatic compatibility is enabled for SUNMI terminals.',
  'Modelo detectado:': 'Detected model:',
  'consultando terminal': 'checking terminal',
  '· Este fabricante ainda não possui adaptador nativo de impressão nesta versão.':
    ' · This manufacturer does not yet have a native print adapter in this version.',
  'ID do POS indisponível': 'POS ID unavailable',
  'Copiar ID do POS': 'Copy POS ID',
  'Para imprimir sem abrir o diálogo do navegador, o agente instalado no computador da guarita busca os tickets na fila e envia à impressora USB ou de rede.':
    'To print without opening the browser dialog, the agent installed on the gatehouse computer retrieves queued tickets and sends them to the USB or network printer.',
  'Último contato: {date}.': 'Last contact: {date}.',
  'O agente ainda não se conectou com o token atual.':
    'The agent has not connected with the current token yet.',
  'Gere um token e configure-o no agente local de impressão. Consulte o guia de instalação do agente.':
    'Generate a token and configure it in the local print agent. See the agent installation guide.',
  'Reiniciar agente e token': 'Restart agent and token',
  'Ativar agente neste POS': 'Activate agent on this POS',
  'Gerar token do agente': 'Generate agent token',
  'Pausar agente neste POS': 'Pause agent on this POS',
  'Último contato:': 'Last contact:',
  'Token do agente': 'Agent token',
  'Já copiei': 'I have copied it',
  'Este token aparece uma única vez. Guarde-o agora: depois de fechar, só é possível gerar outro.':
    'This token is shown only once. Save it now: after closing, you can only generate a new one.',
  'O serviço nativo está ativo. O token fica protegido pelo Android Keystore neste terminal.':
    'The native service is active. Android Keystore protects the token on this terminal.',
  'O token foi gerado, mas o agente não iniciou. Você pode copiá-lo e tentar novamente após verificar a compatibilidade do terminal.':
    'The token was generated, but the agent did not start. You can copy it and try again after checking terminal compatibility.',
  'ID deste POS:': 'This POS ID:',
  indisponível: 'unavailable',
  'No computador da guarita, em um PowerShell como administrador:':
    'On the gatehouse computer, open PowerShell as administrator:',
  'Depois reinicie o serviço local de impressão no Windows.':
    'Then restart the local Windows print service.',
  'Impressora salva.': 'Printer saved.',
  'Impressora desativada.': 'Printer deactivated.',
  'Página de teste enviada. Acompanhe em Últimas impressões.':
    'Test page sent. Track it under Recent print jobs.',
  Impressoras: 'Printers',
  'Nova impressora': 'New printer',
  'as impressoras': 'the printers',
  'Nenhuma impressora cadastrada': 'No printers added',
  'Cadastre a impressora da guarita para imprimir tickets com QR Code.':
    'Add the gatehouse printer to print QR code tickets.',
  'Impressoras cadastradas': 'Registered printers',
  Conexão: 'Connection',
  'Rede · {address}:{port}': 'Network · {address}:{port}',
  Fechamento: 'Closing',
  e: ' and ',
  'Gere o token do agente primeiro.': 'Generate the agent token first.',
  'Agente sem contato. Atualize o token no serviço local e reinicie-o.':
    'Agent disconnected. Update the token in the local service and restart it.',
  'Desativar impressora?': 'Deactivate printer?',
  '{name} deixará de receber tickets. Você pode reativá-la em Editar.':
    '{name} will stop receiving tickets. You can reactivate it under Edit.',
  'Editar impressora': 'Edit printer',
  'Salvar impressora': 'Save printer',
  'Histórico do agente': 'Agent history',
  'Últimas impressões': 'Recent print jobs',
  'Atualizar impressões': 'Refresh print jobs',
  'Os pedidos pendentes do agente ficam pausados neste modo. Trabalhos já iniciados podem terminar. O navegador abre o diálogo do sistema e não confirma a saída do papel neste histórico.':
    'Pending agent jobs are paused in this mode. Jobs already started may finish. The browser opens the system dialog and does not confirm physical printing in this history.',
  'as impressões': 'the print jobs',
  'Nenhuma impressão ainda': 'No print jobs yet',
  'Tickets e testes enviados aparecem aqui.': 'Sent tickets and tests appear here.',
  'Últimas 20 impressões': 'Last 20 print jobs',
  Quando: 'When',
  Impressora: 'Printer',
  Detalhe: 'Details',
  Teste: 'Test',
  'Ticket · estadia #{id}': 'Ticket · stay #{id}',
  '{count} tentativas': '{count} attempts',
  Impressão: 'Printing',
  'Escolha entre o diálogo de impressão do navegador e o agente para tickets com QR Code.':
    'Choose between the browser print dialog and the agent for QR code tickets.',
  'a configuração de impressão': 'the printing settings',
  'Faróis, lâmpadas e piscas': 'Headlights, bulbs and turn signals',
  'Estepe e chave de roda': 'Spare tire and lug wrench',
  'Macaco e triângulo': 'Jack and warning triangle',
  'Limpador e lavador': 'Wipers and washer',
  Extintor: 'Fire extinguisher',
  Buzina: 'Horn',
  'Pneus dianteiros': 'Front tires',
  'Pneus traseiros': 'Rear tires',
  'Calotas e rodas': 'Hubcaps and wheels',
  'Freios (pé e mão)': 'Brakes (foot and hand)',
  'Cinto de segurança': 'Seat belt',
  'Indicadores do painel': 'Dashboard indicators',
  'Óleo do motor': 'Engine oil',
  'Fluido de freio': 'Brake fluid',
  'Líquido de arrefecimento': 'Coolant',
  'Motor de partida': 'Starter motor',
  'Fechamento das janelas': 'Window closure',
  Tapetes: 'Floor mats',
  'Antena e tampão traseiro': 'Antenna and rear parcel shelf',
  Outro: 'Other',
  Bom: 'Good',
  Ruim: 'Poor',
  'Faltante / não funciona': 'Missing / not working',
  Amassado: 'Dented',
  Riscado: 'Scratched',
  Quebrado: 'Broken',
  Faltante: 'Missing',
  'Vista superior': 'Top view',
  'Lateral esquerda': 'Left side',
  'Lateral direita': 'Right side',
  Frente: 'Front',
  Traseira: 'Rear',
  '· frente': '· front',
  '{view}: toque no ponto da avaria (Enter marca no centro)':
    '{view}: tap the damage location (Enter marks the center)',
  '{view}: {count} avaria(s)': '{view}: {count} damage mark(s)',
  'Informe só números, até 9.999.999 km.': 'Enter digits only, up to 9,999,999 km.',
  'A data não pode estar no futuro.': 'The date cannot be in the future.',
  'Data inválida.': 'Invalid date.',
  'Use até 1000 caracteres.': 'Use up to 1000 characters.',
  'Descreva o item avaliado.': 'Describe the inspected item.',
  'Use até 100 caracteres.': 'Use up to 100 characters.',
  'Checklist veicular': 'Vehicle inspection',
  'As alterações não salvas serão perdidas.': 'Unsaved changes will be lost.',
  'Continuar editando': 'Keep editing',
  'Descartar alterações': 'Discard changes',
  'Cancelar edição': 'Cancel editing',
  'Salvar checklist': 'Save inspection',
  'Editar checklist': 'Edit inspection',
  'o checklist': 'the inspection',
  'Marca / modelo': 'Make / model',
  'Km atual': 'Current mileage (km)',
  'Última manutenção': 'Last maintenance',
  'Itens verificados': 'Inspected items',
  'Toque novamente para limpar a escolha.': 'Tap again to clear your selection.',
  'Qual item?': 'Which item?',
  'Mapa de avarias': 'Damage map',
  'marcada(s)': 'marked',
  'Tipo de avaria a marcar': 'Damage type to mark',
  'Limite de {count} marcações atingido. Remova alguma para marcar outra.':
    'Limit of {count} marks reached. Remove a mark to add another.',
  'Escolha o tipo e toque no desenho onde está a avaria. Toque numa marcação para selecioná-la.':
    'Choose a type and tap the diagram where the damage is. Tap a mark to select it.',
  'Selecionar avaria {number}': 'Select damage {number}',
  'Observação da avaria {number}': 'Damage {number} note',
  'Remover avaria {number}': 'Remove damage {number}',
  'Observação (opcional)': 'Note (optional)',
  'O checklist não foi realizado nesta estadia.':
    'No vehicle inspection was completed for this stay.',
  Atendente: 'Attendant',
  'Atualizado em': 'Updated at',
  'Estadia encerrada: o checklist está disponível apenas para consulta.':
    'Stay closed: the inspection is available for viewing only.',
  'não avaliado(s)': 'not inspected',
  'Nenhum item avaliado.': 'No items inspected.',
  'Checklist salvo.': 'Inspection saved.',
  'Recebimento na plataforma — repasse pela gestão':
    'Payment received by platform — transfer by administrator',
  'Emissão aguardando conciliação': 'Issuance awaiting reconciliation',
  'Abrir fatura Asaas': 'Open Asaas invoice',
  'Pix copiado.': 'Pix code copied.',
  'Não foi possível copiar. Abra a fatura para pagar.': 'Unable to copy. Open the invoice to pay.',
  'Copiar Pix': 'Copy Pix code',
  'Emitir cobrança no Asaas?': 'Issue charge in Asaas?',
  '{amount} será enviado ao ambiente configurado em Integrações.':
    '{amount} will be sent to the environment configured under Integrations.',
  'Emitir cobrança': 'Issue charge',
  'Emitir no Asaas': 'Issue in Asaas',
  'Atualizar cobrança': 'Refresh charge',
  'Cancelar cobrança no Asaas?': 'Cancel charge in Asaas?',
  'A cobrança será cancelada no provedor e o histórico será preservado.':
    'The charge will be canceled with the provider and its history will be preserved.',
  'Cancelar cobrança': 'Cancel charge',
  'Cancelar no Asaas': 'Cancel in Asaas',
  'Informe um valor entre R$ 0,01 e R$ 21.474.836,47.':
    'Enter an amount between R$0.01 and R$21,474,836.47.',
  'Informe o vencimento.': 'Enter the due date.',
  'Informe uma estadia ou um cliente.': 'Enter a stay or a customer.',
  Pagamento: 'Payment',
  'Estadia #{id}': 'Stay #{id}',
  'Cobrança independente': 'Standalone charge',
  'Cobrança Asaas': 'Asaas charge',
  Meio: 'Method',
  Avulso: 'Walk-in',
  'Confirmar recebimento': 'Confirm receipt',
  'Confirmar recebimento?': 'Confirm receipt?',
  '{amount} será marcado como pago.': '{amount} will be marked as paid.',
  'Cancelar pagamento': 'Cancel payment',
  'Cancelar pagamento?': 'Cancel payment?',
  'O registro será preservado no histórico.': 'The record will be preserved in the history.',
  'Vinculado ao Asaas': 'Linked to Asaas',
  'Acompanhe as cobranças e registre os recebimentos.':
    'Track charges and record payments received.',
  'Consulte os pagamentos vinculados à sua conta.': 'View payments linked to your account.',
  'Registrar pagamento': 'Record payment',
  'Registre o pagamento e selecione Emitir no Asaas para gerar Pix, boleto ou fatura de cartão. A emissão exige um cliente com CPF/CNPJ e a integração configurada pelo administrador.':
    'Record the payment and select Issue in Asaas to generate a Pix charge, boleto or card invoice. Issuance requires a customer with a CPF/CNPJ and an integration configured by the administrator.',
  'Histórico de pagamentos': 'Payment history',
  'Meus pagamentos': 'My payments',
  registros: 'records',
  'os pagamentos': 'the payments',
  'Nenhum pagamento registrado': 'No payments recorded',
  'Os recebimentos registrados aparecerão aqui.': 'Recorded payments will appear here.',
  'Seus pagamentos aparecerão aqui quando forem registrados.':
    'Your payments will appear here when recorded.',
  'Código da estadia': 'Stay ID',
  'A estadia deve estar concluída.': 'The stay must be closed.',
  'Código do cliente': 'Customer ID',
  'Use o cliente do veículo. Deixe vazio somente para avulsos.':
    'Use the vehicle’s customer. Leave blank only for walk-ins.',
  'Valor do pagamento': 'Payment amount',
  'Meio de pagamento': 'Payment method',
};

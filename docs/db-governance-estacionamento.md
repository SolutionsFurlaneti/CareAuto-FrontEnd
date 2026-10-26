# Governança do Banco de Dados - EstacionamentoDb

Guia rigoroso para proteger a modelagem do banco `EstacionamentoDb` contra o inchaço (*database bloat*) e a criação desnecessária de novas tabelas durante futuras implementações.

---

## 1. Diretrizes de Governança e Reuso (Os 3 Pilares)

Antes de propor qualquer alteração na estrutura do banco, siga esta árvore de decisão:

### Pilar 1: Reuso das Tabelas Existentes (Regra de Ouro)
Toda nova funcionalidade deve obrigatoriamente tentar se encaixar na estrutura atual antes de solicitar uma tabela nova:
* **Novos Atributos/Configurações simples**: Adicione colunas na tabela existente do contexto (ex: novo parâmetro no cliente -> `CadastroCliente`, nova taxa/desconto -> `ConfiguracaoTabelaPreco`).
* **Novos Tipos de Serviços/Ações**: Adicione registros na tabela `ConfiguracaoServico` (campo `Modulo`) ou use o campo `Tipo` das tabelas existentes.
* **Novos Meios ou Modos de Pagamento**: Reutilize a tabela `FinanceiroPagamento` alterando o enum de `Meio` ou `Status`.

### Pilar 2: Uso Estratégico de Campos JSON
Para dados complementares, semi-estruturados ou que variam dependendo de integrações externas, utilize colunas de texto com validação JSON (`NVARCHAR(MAX)` com `ISJSON()`).
* **Objetivo:** Evitar a criação de "tabelas de detalhes" filhas que armazenam apenas poucas propriedades específicas.
* **Exemplo:** A tabela `IntegracaoConsultaPlaca` já utiliza `RespostaRawJson`.

### Pilar 3: Checklist de Aprovação Prévia
Uma nova tabela **só é aceita** se você responder **NÃO** a todas as perguntas abaixo:
- [ ] A demanda pode ser atendida cadastrando uma nova linha numa tabela existente de domínio (`CadastroServico`, `ConfiguracaoTabelaPreco`)?
- [ ] A demanda pode ser resolvida adicionando de 1 a 3 colunas numa tabela existente?
- [ ] Os dados adicionais são dinâmicos/não relacionais e cabem em um campo JSON?

---

## 2. Quando uma Nova Tabela É Permitida (Critérios Estritos)

Uma nova tabela só pode ser criada se:
1. Existir um relacionamento de cardinalidade 1:N ou N:M **novo e complexo** que não possa ser representado nas tabelas de relacionamento já existentes (`ConfiguracaoServicoValor`, `OperacaoEstadiaServico`).
2. A entidade possuir ciclo de vida, status e auditoria **independentes** do resto do sistema.
3. Houver necessidade explícita de alto volume de escrita/leitura isolado por questão de performance e índices.
4. Não romper o isolamento dos módulos existentes (`Cadastro`, `Configuracao`, `Operacao`, `Financeiro`, `Integracao`).

---

## 3. Padrões de Nomenclatura e Tipagem Obrigatória

Caso a nova tabela seja aprovada, ela deve seguir rigidamente o padrão:
* **Prefixos de Módulo Obrigatórios**: `Cadastro*`, `Configuracao*`, `Operacao*`, `Financeiro*`, `Integracao*`.
* **Chaves Primárias**: `[NomeTabelaId]` (`INT` para tabelas de domínio/configuração, `BIGINT` para tabelas operacionais e financeiras de alto volume).
* **Chaves Estrangeiras**: Nomes explícitos no formato `FK_TabelaOrigem_TabelaDestino`.
* **Valores Monetários**: `[ValorCentavos] INT` (preferencial para integrações de pagamento) ou `[Valor] DECIMAL(10,2)` (para configurações e cálculos).
* **Datas**: `DATETIME2(3)` com restrição `DEFAULT (sysutcdatetime())`.
* **Tipos de Texto**: `VARCHAR` para códigos/hashes/placas (tamanho fixo ou sem acento), `NVARCHAR` para nomes, descrições e observações (com acentuação).
* **Booleanos**: `BIT` com restrição `DEFAULT ((1))` para tabelas de cadastro e configuração ativas.

---

## 4. Exemplos Práticos de Bloqueio de Tabelas Desnecessárias

* **Cenário A - "Precisamos adicionar lavagem detalhada de motor":**
  * ❌ *Maneira Incorreta:* Criar a tabela `CadastroLavaMotor`.
  * ✅ *Maneira Correta:* Inserir um registro em `ConfiguracaoServico` com `Modulo = 'LAVA_RAPIDO'` e definir os preços por categoria de carroceria em `ConfiguracaoServicoValor`.

* **Cenário B - "Precisamos registrar convênios com lojas vizinhas":**
  * ❌ *Maneira Incorreta:* Criar tabelas `CadastroConvenio` e `HistoricoConvenio`.
  * ✅ *Maneira Correta:* Cadastrar a loja parceira em `CadastroCliente` (PJ) e vincular uma regra em `ConfiguracaoTabelaPreco` dedicada a essa parceria.

* **Cenário C - "Salvar dados da vistoria de funilaria (riscos, amassados)":**
  * ❌ *Maneira Incorreta:* Criar tabelas `OperacaoVistoriaVeiculo` e `OperacaoVistoriaItem`.
  * ✅ *Maneira Correta:* Incluir o campo `ObservacaoVistoriaJson NVARCHAR(MAX)` dentro de `OperacaoEstadia` para salvar a lista de avarias em formato JSON estruturado.

---

## 5. Diretriz para o Desenvolvedor / Assistente de IA

Ao solicitar alterações ao Copilot, Cursor, ChatGPT ou equipe, forneça sempre o seguinte contexto (ou marque este arquivo):

> "Você é o Arquiteto de Banco de Dados especialista no EstacionamentoDb (SQL Server). Sua missão primária é EVITAR O INCHAÇO DO BANCO DE DADOS e proteger a arquitetura existente. NUNCA crie uma nova tabela se a funcionalidade puder ser atendida por adição de colunas, novos registros em tabelas de catálogo ou campos JSON. Para qualquer alteração proposta, justifique primeiro por que as tabelas existentes NÃO puderam ser reutilizadas."

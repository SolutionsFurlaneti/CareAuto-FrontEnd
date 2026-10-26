import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Field,
  SelectField,
  TextAreaField,
  MoneyField,
  Modal,
  Button,
  StatusBadge,
  EmptyState,
  Skeleton,
  Tabs,
  Switch,
} from './index';
import { Activity, KeyRound, Settings2 } from 'lucide-react';
const meta = { title: 'Interface/Primitives', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Fields: Story = {
  render: () => (
    <div className="form-grid">
      <Field label="Nome" placeholder="Nome do cliente" />
      <Field label="Documento" error="Informe 11 dígitos para CPF." />
      <SelectField label="Categoria">
        <option>Selecione</option>
        <option>Hatch</option>
      </SelectField>
      <TextAreaField label="Observações" />
    </div>
  ),
};
function Amount() {
  const [value, setValue] = useState<number | null>(123.45);
  return <MoneyField label="Valor" value={value} onChange={setValue} />;
}
export const Money: Story = { render: () => <Amount /> };
export const Status: Story = {
  render: () => (
    <div className="page-actions">
      <StatusBadge status="EM_ANDAMENTO" label="Em andamento" />
      <StatusBadge status="PAGO" label="Pago" />
      <StatusBadge status="CANCELADO" label="Cancelado" />
    </div>
  ),
};
export const Empty: Story = {
  render: () => (
    <EmptyState title="Nenhum registro" description="Os próximos registros aparecerão aqui." />
  ),
};
export const Loading: Story = { render: () => <Skeleton /> };
function DialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir formulário</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo cliente"
        actions={<Button onClick={() => setOpen(false)}>Concluir</Button>}
      >
        <Field label="Nome" />
      </Modal>
    </>
  );
}
export const Dialog: Story = { render: () => <DialogExample /> };
function TabsExample() {
  const [tab, setTab] = useState('credenciais');
  return (
    <Tabs
      label="Seções da integração"
      idPrefix="story"
      value={tab}
      onChange={setTab}
      items={[
        { id: 'credenciais', label: 'Credenciais', icon: <KeyRound size={16} /> },
        { id: 'configuracoes', label: 'Configurações', icon: <Settings2 size={16} /> },
        { id: 'status', label: 'Status', icon: <Activity size={16} /> },
      ]}
    />
  );
}
export const IconTabs: Story = { render: () => <TabsExample /> };
function SwitchExample() {
  const [on, setOn] = useState(true);
  return (
    <div className="switch-group">
      <Switch
        label="Perguntar se deseja imprimir na entrada"
        description="Mostra a pergunta depois de salvar."
        checked={on}
        onChange={setOn}
      />
      <Switch
        label="Imprimir automaticamente"
        checked={false}
        disabled
        onChange={() => undefined}
      />
    </div>
  );
}
export const Switches: Story = { render: () => <SwitchExample /> };

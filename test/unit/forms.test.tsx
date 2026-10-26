import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { RecordForm } from '../../src/components/RecordForm';
import { MoneyField, Modal, Button } from '../../src/ui';
import { clientsSchema } from '../../src/features/clients/clientsSchema';
import { toNullableId, toNullableText } from '../../src/lib/forms';
import { dateOnly, money } from '../../src/lib/format';
import { MaterialTheme } from '../../src/components/MaterialTheme';
describe('forms and accessiblity', () => {
  it('registers native refs and sends optional blank fields as null', async () => {
    const submit = vi.fn();
    render(
      <RecordForm
        spec={{
          schema: clientsSchema,
          defaults: {
            nomeOuRazaoSocial: '',
            tipoPessoa: 'PF',
            documento: '',
            email: null,
            celular: null,
          },
          fields: [
            { name: 'nomeOuRazaoSocial', label: 'Nome' },
            { name: 'tipoPessoa', label: 'Tipo' },
            { name: 'documento', label: 'Documento' },
            { name: 'email', label: 'E-mail', optional: true },
            { name: 'celular', label: 'Celular', optional: true },
          ],
        }}
        onSubmit={submit}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^Nome/), 'Ana');
    await user.type(screen.getByLabelText(/^Documento/), '12345678901');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(submit.mock.calls[0][0]).toMatchObject({
      nomeOuRazaoSocial: 'Ana',
      email: null,
      celular: null,
    });
  });
  it('connects validation error with the field', async () => {
    render(
      <RecordForm
        spec={{
          schema: clientsSchema,
          defaults: {
            nomeOuRazaoSocial: '',
            tipoPessoa: 'PF',
            documento: '',
            email: null,
            celular: null,
          },
          fields: [
            { name: 'nomeOuRazaoSocial', label: 'Nome' },
            { name: 'documento', label: 'Documento' },
          ],
        }}
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByLabelText(/^Nome/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });
  it('keeps money numeric while rendering BRL', async () => {
    function Fixture() {
      const [value, setValue] = useState<number | null>(0);
      return (
        <>
          <MoneyField label="Valor" value={value} onChange={setValue} />
          <output data-testid="value">{value}</output>
        </>
      );
    }
    render(<Fixture />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('Valor'));
    await user.type(screen.getByLabelText('Valor'), '1250');
    expect(screen.getByTestId('value')).toHaveTextContent('12.5');
  });
  it('handles optional IDs and UTC-free dates', () => {
    expect(toNullableId('')).toBeNull();
    expect(toNullableId('42')).toBe(42);
    expect(toNullableText('  ')).toBeNull();
    expect(dateOnly('2026-10-05')).toBe('05/10/2026');
    expect(money(12.5)).toContain('12,50');
  });
  it('closes dialog on Escape and restores focus', async () => {
    function Fixture() {
      const [open, setOpen] = useState(false);
      return (
        <MaterialTheme>
          <Button onClick={() => setOpen(true)}>Abrir</Button>
          <Modal open={open} onClose={() => setOpen(false)} title="Detalhes">
            <Button>Dentro</Button>
          </Modal>
        </MaterialTheme>
      );
    }
    render(<Fixture />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Abrir'));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Detalhes');
    await user.keyboard('{Escape}');
    expect(screen.getByText('Abrir')).toHaveFocus();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RecoveryPage } from '../../src/features/auth/RecoveryPage';
import { api } from '../../src/lib/apiClient';
vi.mock('../../src/lib/apiClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/apiClient')>()),
  api: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());
describe('password recovery', () => {
  it('submits registered email anonymously and shows instructions without exposing existence', async () => {
    vi.mocked(api).mockResolvedValue(true);
    render(
      <MemoryRouter>
        <RecoveryPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'E-mail cadastrado' }), 'owner@example.test');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar senha provisória' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Se houver uma conta ativa');
    expect(screen.getByRole('status')).toHaveTextContent('30 minutos');
    expect(api).toHaveBeenCalledWith('/api/v1/auth/recuperar-senha', {
      method: 'POST',
      auth: 'none',
      body: JSON.stringify({ email: 'owner@example.test' }),
    });
    expect(screen.getByTestId('recovery-login')).toHaveAttribute('href', '/login');
  });
  it('keeps the form available when the request fails', async () => {
    vi.mocked(api).mockRejectedValue(new Error('Falha de rede'));
    render(
      <MemoryRouter>
        <RecoveryPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'E-mail cadastrado' }), 'owner@example.test');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar senha provisória' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'E-mail cadastrado' })).toHaveValue('owner@example.test');
  });
});

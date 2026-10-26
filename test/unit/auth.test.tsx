import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from '../../src/components/RequireAuth';
import { useAuthStore, isSessionValid, hasRole } from '../../src/stores/authStore';
import { safeReturnPath, appPath } from '../../src/lib/basePath';
describe('session boundary', () => {
  it('redirects expired sessions to login', () => {
    useAuthStore.getState().setSession({
      userId: 'old',
      estabelecimentoId: 1,
      estabelecimentoNome: 'Estacionamento de teste',
      userName: 'old',
      email: '',
      accessToken: 'x',
      roles: ['Admin'],
      expiresAtUtc: '2000-01-01T00:00:00Z',
    });
    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={
              <RequireAuth>
                <p>Private</p>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
  it('rejects malformed expiry and external return paths', () => {
    expect(isSessionValid(null)).toBe(false);
    expect(safeReturnPath('//evil.example')).toBe('/');
    expect(safeReturnPath('/\\evil')).toBe('/');
    expect(safeReturnPath('/pagamentos?page=2')).toBe('/pagamentos?page=2');
    expect(appPath('/login')).toMatch(/\/login$/);
    expect(hasRole(['Cliente'], ['Admin'])).toBe(false);
  });
});

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LanguageSelector } from '../../src/components/LanguageSelector';
import { LandingTutorials } from '../../src/features/landing/LandingTutorials';
import { translateForLocale } from '../../src/i18n';
import { money, dateOnly, integer } from '../../src/lib/format';
import { useLocaleStore } from '../../src/stores/localeStore';
import { Modal } from '../../src/ui/Modal';
import { ApiError } from '../../src/lib/apiClient';
import { describeError } from '../../src/lib/describeError';

describe('React language preference', () => {
  it.each([
    ['backoffice.credenciais', 'Login ou senha inválidos.', 'Invalid username or password.'],
    ['backoffice.senha_atual', 'A senha atual não confere.', 'The current password is incorrect.'],
  ])('translates the stored API error %s when presenting it', (code, source, english) => {
    const error = new ApiError(400, code, source);
    useLocaleStore.getState().setLocale('en-US');
    expect(describeError(error)).toBe(english);
    useLocaleStore.getState().setLocale('pt-BR');
    expect(describeError(error)).toBe(source);
  });
  it('preserves user-authored dialog titles even when they match a translation key', () => {
    useLocaleStore.getState().setLocale('en-US');
    render(
      <Modal open title="Nome" onClose={() => {}}>
        <p>Plano São João</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Nome' })).toBeVisible();
    expect(screen.getByText('Plano São João')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close form' })).toBeVisible();
  });
  it('switches written guidance locally and saves the selected language', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const { container } = render(
      <>
        <LanguageSelector />
        <LandingTutorials />
      </>,
    );
    expect(screen.getByRole('heading', { name: 'Comece hoje, em três passos' })).toBeVisible();

    await userEvent.selectOptions(screen.getByTestId('language-selector'), 'en-US');

    expect(screen.getByRole('heading', { name: 'Get started today in three steps' })).toBeVisible();
    expect(screen.getByTestId('lp-tutorial-progress')).toHaveTextContent('Step 1 of 3');
    expect(document.documentElement).toHaveAttribute('lang', 'en-US');
    expect(JSON.parse(window.localStorage.getItem('AutoCareManager-locale') || '{}')).toMatchObject(
      {
        state: { locale: 'en-US' },
      },
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(container.querySelector('iframe, video')).toBeNull();

    await userEvent.selectOptions(screen.getByTestId('language-selector'), 'pt-BR');
    expect(screen.getByRole('heading', { name: 'Comece hoje, em três passos' })).toBeVisible();
    expect(document.documentElement).toHaveAttribute('lang', 'pt-BR');
  });

  it('restores a saved preference and rejects unsupported saved locales', async () => {
    render(<LanguageSelector />);
    window.localStorage.setItem(
      'AutoCareManager-locale',
      JSON.stringify({ state: { locale: 'en-US' }, version: 0 }),
    );
    await act(async () => {
      await useLocaleStore.persist.rehydrate();
    });
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en-US');
    expect(document.documentElement).toHaveAttribute('lang', 'en-US');

    window.localStorage.setItem(
      'AutoCareManager-locale',
      JSON.stringify({ state: { locale: 'es-ES' }, version: 0 }),
    );
    await act(async () => {
      await useLocaleStore.persist.rehydrate();
    });
    expect(screen.getByRole('combobox', { name: 'Idioma' })).toHaveValue('pt-BR');
    expect(document.documentElement).toHaveAttribute('lang', 'pt-BR');
  });

  it('changes number and date presentation while keeping Brazilian currency and amounts', () => {
    expect(dateOnly('2026-11-20')).toBe('20/11/2026');
    expect(integer(1234)).toBe('1.234');
    useLocaleStore.getState().setLocale('en-US');
    expect(dateOnly('2026-11-20')).toBe('11/20/2026');
    expect(integer(1234)).toBe('1,234');
    expect(money(1234.5)).toMatch(/R\$\s?1,234\.50/);
    expect(money(null)).toBe('—');
  });

  it('interpolates stage numbers and preserves unknown content, including inherited property names', () => {
    expect(translateForLocale('en-US', 'constructor')).toBe('constructor');
    expect(translateForLocale('en-US', 'toString')).toBe('toString');
    expect(translateForLocale('en-US', '__proto__')).toBe('__proto__');
    expect(
      translateForLocale('en-US', 'Etapa {current} de {total}', { current: 2, total: 3 }),
    ).toBe('Step 2 of 3');
    expect(translateForLocale('en-US', 'Meu estacionamento particular')).toBe(
      'Meu estacionamento particular',
    );
    expect(
      translateForLocale('pt-BR', 'Etapa {current} de {total}', { current: 1, total: 3 }),
    ).toBe('Etapa 1 de 3');
  });
});

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { openNav } from '../../support/session';

async function leave(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) < 900) await page.getByTestId('nav-open').click();
  await page.getByTestId('logout').click();
  await expect(page).toHaveURL(/\/login$/);
}

test('two establishments personalize their own clients and retain isolation after login changes', async ({
  page,
  request,
}) => {
  const response = await request.post('http://127.0.0.1:5081/__test/session', {
    data: { role: 'Admin', accounts: true },
  });
  expect(response.ok()).toBeTruthy();
  const state = (await response.json()) as { key: string };
  await page.context().setExtraHTTPHeaders({ 'X-AutoCare-Test-Session': state.key });
  const password = 'Dono12';
  try {
    for (const n of [1, 2]) {
      await page.goto('/login');
      await page.getByTestId('first-access').click();
      await page.getByTestId('field-estacionamento').fill(`Estacionamento ${n}`);
      await page.getByTestId('field-documento').fill(n === 1 ? '12345678000199' : '98765432000188');
      await page.getByTestId('field-nome').fill(`Dono ${n}`);
      await page.getByTestId('field-email').fill(`dono${n}@example.test`);
      await page.getByTestId('field-senha').fill(password);
      await page.getByTestId('field-confirmarSenha').fill(password);
      await expect(page.getByTestId('field-chaveInstalacao')).toHaveCount(0);
      await page.getByTestId('form-submit').click();
      await expect(page).toHaveURL(/\/$/);
      await openNav(page, 'nav-clientes');
      await expect(page.getByTestId('clientes-table-row')).toHaveCount(0);
      await page.getByTestId('record-new').click();
      await page.getByTestId('field-nomeOuRazaoSocial').fill(`Cliente exclusivo ${n}`);
      await page.getByTestId('field-documento').fill('12345678901');
      await page.getByTestId('form-submit').click();
      await expect(page.getByTestId('modal')).not.toBeVisible();
      await expect(page.getByTestId('clientes-table-row')).toHaveCount(1);
      await expect(page.getByTestId('clientes-table-row')).toContainText(`Cliente exclusivo ${n}`);
      await openNav(page, 'nav-usuarios');
      await expect(page.getByTestId('users-table-row')).toHaveCount(1);
      await expect(page.getByTestId('users-table-row')).toContainText(`Dono ${n}`);
      await leave(page);
    }
    await page.getByTestId('field-email').fill('dono1@example.test');
    await page.getByTestId('field-senha').fill(password);
    await page.getByTestId('form-submit').click();
    await expect(page).toHaveURL(/\/$/);
    await openNav(page, 'nav-clientes');
    await expect(page.getByTestId('clientes-table-row')).toHaveCount(1);
    await expect(page.getByTestId('clientes-table-row')).toContainText('Cliente exclusivo 1');
    await expect(page.getByTestId('clientes-table-row')).not.toContainText('Cliente exclusivo 2');
    if ((page.viewportSize()?.width ?? 1440) < 900) await page.getByTestId('nav-open').click();
    await expect(page.getByTestId('estabelecimento-atual')).toHaveText('Estacionamento 1');
  } finally {
    if (process.env.COVERAGE === 'true') {
      const coverage = await page.evaluate(() => Reflect.get(window, '__coverage__') as unknown);
      if (coverage) {
        mkdirSync('coverage/e2e', { recursive: true });
        writeFileSync('coverage/e2e/' + randomUUID() + '.json', JSON.stringify(coverage));
      }
    }
    await request.delete('http://127.0.0.1:5081/__test/session', {
      headers: { 'X-AutoCare-Test-Session': state.key },
    });
  }
});
test('owner onboards, creates employee, requires password change and revokes access', async ({
  page,
  request,
}, testInfo) => {
  const response = await request.post('http://127.0.0.1:5081/__test/session', {
    data: { role: 'Admin', accounts: true },
  });
  expect(response.ok()).toBeTruthy();
  const state = (await response.json()) as { key: string };
  await page.context().setExtraHTTPHeaders({ 'X-AutoCare-Test-Session': state.key });
  const ownerPassword = 'Dono12';
  const temporary = 'Temp12';
  const personal = 'Nova12';
  try {
    await page.goto('/login');
    await page.getByTestId('first-access').click();
    await page.getByTestId('field-estacionamento').fill('AutoCare Centro');
    await page.getByTestId('field-documento').fill('12345678000199');
    await page.getByTestId('field-nome').fill('Marina Administradora');
    await page.getByTestId('field-email').fill('dono@example.test');
    await page.getByTestId('field-senha').fill(ownerPassword);
    await page.getByTestId('field-confirmarSenha').fill(ownerPassword);
    await expect(page.getByTestId('field-chaveInstalacao')).toHaveCount(0);
    await page.getByTestId('form-submit').click();
    await expect(page).toHaveURL(/\/$/);
    await openNav(page, 'nav-usuarios');
    await page.getByTestId('user-new').click();
    await page.getByTestId('field-nome').fill('Carlos Funcionário');
    await page.getByTestId('field-email').fill('equipe@example.test');
    await page.getByTestId('field-senhaProvisoria').fill(temporary);
    await page.getByTestId('form-submit').click();
    await expect(page.getByTestId('users-table-row').filter({ hasText: 'Carlos' })).toContainText(
      'Funcionário',
    );
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('main')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: testInfo.outputPath('equipe.png'), fullPage: true });
    if ((page.viewportSize()?.width ?? 1440) < 900) await page.getByTestId('nav-open').click();
    await page.getByTestId('logout').click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByTestId('field-email').fill('equipe@example.test');
    await page.getByTestId('field-senha').fill('senha incorreta');
    await page.getByTestId('form-submit').click();
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos');
    await page.getByTestId('field-senha').fill(temporary);
    await page.getByTestId('form-submit').click();
    await expect(page).toHaveURL(/\/trocar-senha$/);
    await page.goto('/clientes');
    await expect(page).toHaveURL(/\/trocar-senha$/);
    await page.getByTestId('field-senhaAtual').fill(temporary);
    await page.getByTestId('field-novaSenha').fill(personal);
    await page.getByTestId('field-confirmarSenha').fill(personal);
    await page.getByTestId('form-submit').click();
    await expect(page).toHaveURL(/\/$/);
    await openNav(page, 'nav-clientes');
    await expect(page.getByTestId('record-new')).toBeVisible();
    await page.goto('/usuarios');
    await expect(page).toHaveURL(/\/$/);
    if ((page.viewportSize()?.width ?? 1440) < 900) await page.getByTestId('nav-open').click();
    await page.getByTestId('logout').click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByTestId('field-email').fill('dono@example.test');
    await page.getByTestId('field-senha').fill(ownerPassword);
    await page.getByTestId('form-submit').click();
    await expect(page).toHaveURL(/\/$/);
    await openNav(page, 'nav-usuarios');
    const employee = page.getByTestId('users-table-row').filter({ hasText: 'Carlos' });
    await employee.getByTestId('user-reset').click();
    await page.getByTestId('field-senhaProvisoria').fill(temporary);
    await page.getByTestId('form-submit').click();
    await expect(employee).toContainText('Troca de senha pendente');
    await employee.getByTestId('user-edit').click();
    await page.getByTestId('field-ativo').selectOption('false');
    await page.getByTestId('form-submit').click();
    await expect(employee).toContainText('Desativado');
  } finally {
    if (process.env.COVERAGE === 'true') {
      const coverage = await page.evaluate(() => Reflect.get(window, '__coverage__') as unknown);
      if (coverage) {
        mkdirSync('coverage/e2e', { recursive: true });
        writeFileSync('coverage/e2e/' + randomUUID() + '.json', JSON.stringify(coverage));
      }
    }
    await request.delete('http://127.0.0.1:5081/__test/session', {
      headers: { 'X-AutoCare-Test-Session': state.key },
    });
  }
});

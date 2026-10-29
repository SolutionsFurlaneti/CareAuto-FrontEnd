import { test as base, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Role, Session } from '../../src/stores/authStore';
interface TestState {
  key: string;
  session: Session;
}
export const test = base.extend<{ authenticated: Page; state: TestState; role: Role }>({
  role: ['Admin', { option: true }],
  state: async ({ request, role }, provide) => {
    if (process.env.E2E_ISOLATED !== 'true' && process.env.E2E_PREPARED !== 'true')
      throw new Error(
        'Use test:e2e:coverage para o ambiente isolado. Testes de API externa requerem sessão preparada e specs próprias.',
      );
    const response = await request.post('http://127.0.0.1:5081/__test/session', { data: { role } });
    expect(response.ok()).toBeTruthy();
    const state = (await response.json()) as TestState;
    await provide(state);
    await request.delete('http://127.0.0.1:5081/__test/session', {
      headers: { 'X-AutoCare-Test-Session': state.key },
    });
  },
  authenticated: async ({ page, state }, provide) => {
    await page.context().setExtraHTTPHeaders({ 'X-AutoCare-Test-Session': state.key });
    await page.goto('/login');
    await page.evaluate(
      (session) =>
        localStorage.setItem(
          'AutoCareManager-auth',
          JSON.stringify({ state: { session }, version: 0 }),
        ),
      state.session,
    );
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
    await provide(page);
    if (process.env.COVERAGE === 'true') {
      const coverage = await page.evaluate(() => Reflect.get(window, '__coverage__') as unknown);
      if (coverage) {
        mkdirSync('coverage/e2e', { recursive: true });
        writeFileSync('coverage/e2e/' + randomUUID() + '.json', JSON.stringify(coverage));
      }
    }
  },
});
export { expect };
export async function openNav(page: Page, testId: string) {
  const temporaryMenu = page.getByTestId('nav-open');
  if (
    (await temporaryMenu.count()) > 0 &&
    (await temporaryMenu.getAttribute('aria-expanded')) === 'false'
  )
    await page.getByRole('button', { name: /^Abrir menu:/ }).click();
  await page.getByTestId(testId).click();
}

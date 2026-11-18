import { test as base, expect } from '../../support/session';
import type { Session } from '../../../src/stores/authStore';

type Visit = {
  id: number;
  url: string;
  country: string | null;
  region: string | null;
  city: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timeZone: string | null;
  address: string | null;
  isp: string | null;
  ipAddressCountry: string | null;
  ipAddressRegion: string | null;
  ipAddressCity: string | null;
};

const test = base.extend({
  state: async ({ request, role }, provide) => {
    const response = await request.post('http://127.0.0.1:5081/__test/session', {
      data: { role, accounts: true, monitoring: true },
    });
    expect(response.ok()).toBeTruthy();
    const state = (await response.json()) as { key: string; session: Session };
    await provide(state);
    await request.delete('http://127.0.0.1:5081/__test/session', {
      headers: { 'X-AutoCare-Test-Session': state.key },
    });
  },
});

test.use({ timezoneId: 'America/Sao_Paulo' });

test('consented coordinates enrich the same visit while IP geography remains independent', async ({
  page,
  context,
  state,
}, testInfo) => {
  await context.setExtraHTTPHeaders({ 'X-AutoCare-Test-Session': state.key });
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: -28.262, longitude: -52.406 });
  const lookups: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/monitoring/location-details')) lookups.push(request.url());
  });
  const visits = async () => {
    const response = await page.request.get('http://127.0.0.1:5081/__test/monitoring-location', {
      headers: { 'X-AutoCare-Test-Session': state.key },
    });
    expect(response.ok()).toBeTruthy();
    return (await response.json()) as Visit[];
  };
  await page.goto('/login');
  await expect(page.getByTestId('location-consent-allow')).toBeVisible();
  await expect.poll(async () => (await visits()).length).toBe(1);
  await expect.poll(async () => (await visits())[0]?.ipAddressCity).toBe('Mountain View');
  const initial = (await visits())[0];
  expect(initial).toMatchObject({
    country: null,
    region: null,
    city: null,
    address: null,
    latitude: null,
    longitude: null,
    ipAddressCountry: 'Estados Unidos',
    ipAddressRegion: 'California',
  });
  expect(lookups).toHaveLength(0);

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 640 : 1000 });
    await expect(page.getByTestId('location-consent-allow')).toBeVisible();
    expect(await page.locator('body').evaluate((body) => body.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('location-consent-dark-mobile.png') });
  await page.evaluate(() =>
    localStorage.setItem(
      'AutoCareManager-theme',
      JSON.stringify({ state: { theme: 'light' }, version: 0 }),
    ),
  );
  await page.reload();
  await expect(page.getByTestId('location-consent-allow')).toBeVisible();
  await expect.poll(async () => (await visits()).length).toBe(2);
  const currentId = (await visits())[1].id;
  await page.screenshot({ path: testInfo.outputPath('location-consent-light-mobile.png') });
  await page.getByTestId('location-consent-allow').click();
  await expect(page.getByTestId('location-consent-stop')).toBeVisible();
  await expect.poll(async () => (await visits())[1]?.address).toContain('Rua de Teste');
  const rows = await visits();
  expect(rows).toHaveLength(2);
  expect(rows[0].id).toBe(initial.id);
  expect(rows[0].latitude).toBeNull();
  expect(rows[1]).toMatchObject({
    id: currentId,
    country: 'Brasil',
    region: 'Rio Grande do Sul',
    city: 'Passo Fundo',
    postalCode: '99000-000',
    latitude: -28.262,
    longitude: -52.406,
    timeZone: 'America/Sao_Paulo',
    isp: 'Provedor de teste IP',
    ipAddressCountry: 'Estados Unidos',
    ipAddressRegion: 'California',
    ipAddressCity: 'Mountain View',
  });
  expect(lookups).toHaveLength(1);
  await page.getByTestId('location-consent-stop').click();
  await page.getByTestId('first-access').click();
  await expect(page).toHaveURL(/\/primeiro-acesso$/);
  await expect.poll(async () => (await visits()).length).toBe(3);
  expect((await visits())[2]).toMatchObject({ latitude: null, longitude: null, address: null });
  expect(lookups).toHaveLength(1);
});

test('declining or denying location keeps navigation available without coordinates', async ({
  page,
  context,
  state,
}) => {
  await context.setExtraHTTPHeaders({ 'X-AutoCare-Test-Session': state.key });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) =>
          failure({
            code: 1,
            message: 'Denied in isolated test',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          }),
      },
    });
  });
  const lookups: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/monitoring/location-details')) lookups.push(request.url());
  });
  await page.goto('/login');
  await page.getByTestId('location-consent-decline').click();
  await expect(page.getByTestId('location-consent-open')).toBeVisible();
  await expect(page.getByTestId('first-access')).toBeVisible();
  await page.getByTestId('location-consent-open').click();
  await expect(page.getByTestId('location-consent-message')).toContainText(
    'permissão de localização foi negada',
  );
  await page.getByTestId('location-consent-decline').click();
  await page.getByTestId('first-access').click();
  await expect(page).toHaveURL(/\/primeiro-acesso$/);
  await expect
    .poll(async () => {
      const response = await page.request.get('http://127.0.0.1:5081/__test/monitoring-location', {
        headers: { 'X-AutoCare-Test-Session': state.key },
      });
      return ((await response.json()) as Visit[]).length;
    })
    .toBe(2);
  const response = await page.request.get('http://127.0.0.1:5081/__test/monitoring-location', {
    headers: { 'X-AutoCare-Test-Session': state.key },
  });
  for (const row of (await response.json()) as Visit[])
    expect(row).toMatchObject({ latitude: null, longitude: null, country: null, address: null });
  expect(lookups).toHaveLength(0);
});

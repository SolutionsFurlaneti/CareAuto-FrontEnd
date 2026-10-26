import { test, expect, openNav } from '../../support/session';
test.use({ role: 'Operador' });
test('operator has read-only configuration and no financial access', async ({
  authenticated: page,
  state,
  request,
}) => {
  await openNav(page, 'nav-categorias');
  await expect(page.getByTestId('record-new')).toHaveCount(0);
  await expect(page.getByTestId('nav-integracoes')).toHaveCount(0);
  await page.goto('/integracoes');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/pagamentos');
  await expect(page).toHaveURL(/\/$/);
  const r = await request.post('http://127.0.0.1:5081/api/v1/categorias-veiculo', {
    headers: {
      'X-AutoCare-Test-Session': state.key,
      Authorization: 'Bearer ' + state.session.accessToken,
    },
    data: { nome: 'Não permitido' },
  });
  expect(r.status()).toBe(403);
});

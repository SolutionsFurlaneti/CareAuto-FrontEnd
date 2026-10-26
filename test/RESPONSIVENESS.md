# Responsividade

Matriz automatizada: 320, 390, 768 e 1024px de largura, além do desktop 1440px. Testes abrem o menu, navegam, abrem o formulário de cliente, verificam os botões visíveis e ausência de overflow horizontal. Os fluxos de negócio são repetidos no projeto mobile (390 × 844).

- Drawer temporário abaixo de 900px; permanente a partir de 900px.
- Tabelas sem duplicação de controles: cartões abaixo de 1200px.
- Campos com 16px em celular/tablet; alvos de toque de 48px.
- Modal com ações separadas da região rolável, altura limitada pelo visualViewport/dvh e safe areas.
- Tema claro persistido após reload; screenshots do painel nos dois temas.
- Motion respeita prefers-reduced-motion; números financeiros não são animados.

Os testes emulados não substituem uma revisão em aparelho físico com teclado virtual, zoom e leitor de tela. Para cada formulário novo, revise títulos longos, altura curta, retorno de erro e foco após fechar.

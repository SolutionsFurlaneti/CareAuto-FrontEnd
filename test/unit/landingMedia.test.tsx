import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  LandingTutorials,
  TutorialPlayer,
  tutorialMedia,
} from '../../src/features/landing/LandingTutorials';
import {
  LandingTestimonials,
  TestimonialCard,
  iniciais,
} from '../../src/features/landing/LandingTestimonials';
import {
  type TutorialPublico,
  type DepoimentoPublico,
} from '../../src/features/landing/contentMedia';

const tutorial: TutorialPublico = {
  id: 'teste',
  titulo: 'Vídeo de cadastro',
  videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  posterUrl: null,
  orientacoes: ['Crie sua conta.'],
};
const depoimento: DepoimentoPublico = {
  id: 'teste-real',
  nome: 'Ana Maria de Souza',
  perfil: 'Administradora',
  relato: 'Relato fornecido para o teste do componente.',
  avaliacao: 4.5,
};

describe('landing tutorials', () => {
  it('keeps players absent until the visitor asks to load the selected tutorial', async () => {
    const { container } = render(<TutorialPlayer tutorial={tutorial} />);
    expect(container.querySelector('iframe, video')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Assistir ao tutorial' }));
    const player = screen.getByTitle('Vídeo de cadastro');
    expect(player).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/abcdefghijk');
    expect(player).toHaveAttribute('loading', 'lazy');
  });

  it('uses a useful, non-loading fallback for missing or unsupported media', () => {
    const { container, rerender } = render(
      <TutorialPlayer tutorial={{ ...tutorial, videoUrl: null }} />,
    );
    expect(screen.getByText('Vídeo tutorial em breve')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Assistir ao tutorial' })).not.toBeInTheDocument();
    expect(container.querySelector('iframe, video')).toBeNull();
    rerender(<TutorialPlayer tutorial={{ ...tutorial, videoUrl: 'javascript:alert(1)' }} />);
    expect(screen.getByText('Vídeo tutorial em breve')).toBeVisible();
    expect(container.querySelector('iframe, video')).toBeNull();
  });

  it('supports direct HTTPS videos and rejects insecure or arbitrary iframe sources', async () => {
    expect(tutorialMedia('https://vimeo.com/123456')).toEqual({
      kind: 'iframe',
      src: 'https://player.vimeo.com/video/123456',
    });
    expect(tutorialMedia('http://example.com/tutorial.mp4')).toBeNull();
    expect(tutorialMedia('https://example.com/page')).toBeNull();
    expect(tutorialMedia('https://youtube.com.evil.example/watch?v=abcdefghijk')).toBeNull();
    expect(tutorialMedia('https://user:password@example.com/tutorial.mp4')).toBeNull();
    render(
      <TutorialPlayer tutorial={{ ...tutorial, videoUrl: 'https://example.com/tutorial.mp4' }} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Assistir ao tutorial' }));
    expect(screen.getByTitle('Vídeo de cadastro')).toHaveAttribute('preload', 'none');
    expect(screen.getByTitle('Vídeo de cadastro')).toHaveAttribute('controls');
  });

  it('lets visitors browse every onboarding stage with the matching written instructions', async () => {
    const { container } = render(<LandingTutorials />);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Crie sua conta de administrador');
    await userEvent.click(screen.getByRole('tab', { name: 'Configuração' }));
    expect(screen.getByRole('tab', { name: 'Configuração' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Prepare a operação do seu negócio');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Cadastre as categorias de veículo');
    await userEvent.click(screen.getByRole('tab', { name: 'Dia a dia' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Da primeira entrada ao recebimento');
    expect(container.querySelector('iframe, video')).toBeNull();
  });

  it('moves keyboard focus to the selected tutorial when advancing the stepper', async () => {
    render(<LandingTutorials />);
    await userEvent.click(screen.getByTestId('lp-next-step-0'));
    expect(screen.getByRole('tab', { name: 'Configuração' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Prepare a operação do seu negócio');
  });
});

describe('landing testimonials', () => {
  it('shows an honest empty state without fabricated customer reviews or ratings', () => {
    const { container } = render(<LandingTestimonials />);
    expect(screen.getByText('Relatos de clientes em breve')).toBeVisible();
    expect(screen.queryByTestId('lp-testimonial')).not.toBeInTheDocument();
    expect(container.querySelector('.MuiRating-root')).toBeNull();
    expect(screen.getByRole('link', { name: 'Conhecer os planos' })).toHaveAttribute(
      'href',
      '#planos',
    );
  });

  it('renders a real record with rating and name initials when the photo is missing', () => {
    render(<TestimonialCard depoimento={depoimento} />);
    const card = screen.getByTestId('lp-testimonial');
    expect(within(card).getByText('AS')).toBeVisible();
    expect(within(card).getByText('Ana Maria de Souza')).toBeVisible();
    expect(within(card).getByText('Administradora')).toBeVisible();
    expect(within(card).getByRole('img', { name: '4.5 de 5 estrelas' })).toBeVisible();
    expect(card).toHaveTextContent(depoimento.relato);
    expect(iniciais('  João  ')).toBe('JO');
    expect(iniciais('')).toBe('CA');
  });

  it('returns to initials if a customer photo fails to load', () => {
    render(
      <TestimonialCard depoimento={{ ...depoimento, fotoUrl: 'https://example.com/ana.jpg' }} />,
    );
    fireEvent.error(screen.getByAltText(depoimento.nome));
    expect(screen.getByText('AS')).toBeVisible();
    expect(screen.queryByAltText(depoimento.nome)).not.toBeInTheDocument();
  });
});

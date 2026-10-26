import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, CarFront, ChevronDown, Menu, X } from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';
import { money } from '../../lib/format';
import { destaques, funcionalidades, passos, perguntas } from './content';
import {
  agrupar,
  destaque,
  listarPlanosPublicos,
  MENSALIDADE_MINIMA,
  oferta,
  type PlanoPublico,
} from './plans';

const TITULO = 'AutoCare | Sistema para estacionamento e lava-rápido · 7 dias grátis';
const DESCRICAO =
  'Controle entradas e saídas, leia placas por foto com IA, imprima tickets com QR Code, faça checklist de avarias e receba por Pix, boleto e cartão. Teste grátis por 7 dias.';

/** Título e descrição da página para o Google, restaurados ao sair. */
function useSeo() {
  useEffect(() => {
    const titulo = document.title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const criada = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const descricao = meta.content;
    document.title = TITULO;
    meta.content = DESCRICAO;
    return () => {
      document.title = titulo;
      if (criada) meta.remove();
      else meta.content = descricao;
    };
  }, []);
}

const CADASTRO = '/primeiro-acesso';

function Cta({ children, testId }: { children: string; testId: string }) {
  return (
    <Link to={CADASTRO} className="button button-primary lp-cta" data-testid={testId}>
      {children}
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}

function PlanoCard({
  plano,
  emDestaque,
  unico,
}: {
  plano: PlanoPublico;
  emDestaque: boolean;
  unico: boolean;
}) {
  const o = oferta(plano);
  return (
    <article className={'lp-plan' + (emDestaque ? ' is-featured' : '')} data-testid="lp-plan">
      {emDestaque ? <span className="lp-plan-flag">Mais vantajoso</span> : null}
      <h3>{plano.nome}</h3>
      <p className="lp-plan-price">
        <strong>{money(o.mensal)}</strong>
        <span>/mês</span>
      </p>
      <p className="lp-plan-billing">{o.cobranca}</p>
      {o.economia ? <p className="lp-plan-save">{o.economia}</p> : null}
      {plano.descricao ? <p className="lp-plan-desc">{plano.descricao}</p> : null}
      <ul>
        <li>
          <Check size={16} aria-hidden="true" /> Todas as funcionalidades
        </li>
        <li>
          <Check size={16} aria-hidden="true" /> Usuários para a sua equipe
        </li>
        <li>
          <Check size={16} aria-hidden="true" /> 7 dias grátis antes da 1ª cobrança
        </li>
      </ul>
      <Link
        to={CADASTRO}
        className={
          'button lp-plan-cta ' + (emDestaque || unico ? 'button-primary' : 'button-secondary')
        }
      >
        Começar grátis
      </Link>
    </article>
  );
}

function Planos() {
  const planos = useQuery({
    queryKey: ['planos-publicos'],
    queryFn: ({ signal }) => listarPlanosPublicos(signal),
    staleTime: 5 * 60_000,
  });
  const lista = planos.data ?? [];
  const { posPago, prePago } = agrupar(lista);
  const [aba, setAba] = useState<'POS_PAGO' | 'PRE_PAGO' | null>(null);
  const atual = aba ?? (posPago.length ? 'POS_PAGO' : 'PRE_PAGO');
  const visiveis = atual === 'POS_PAGO' ? posPago : prePago;
  const melhor = destaque(visiveis);

  if (planos.isPending)
    return (
      <div className="lp-plans" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="lp-plan lp-plan-skeleton" />
        ))}
      </div>
    );
  // Sem planos publicados (ou falha): mostra a regra de preço em vez de uma seção vazia.
  if (!lista.length)
    return (
      <div className="lp-plan lp-plan-fallback" data-testid="lp-plans-fallback">
        <p className="lp-plan-price">
          <span>a partir de</span>
          <strong>{money(MENSALIDADE_MINIMA)}</strong>
          <span>/mês</span>
        </p>
        <p className="lp-plan-billing">
          Planos mensais ou de longo prazo, com desconto para pagamento à vista.
        </p>
        <Cta testId="lp-plans-fallback-cta">Começar 7 dias grátis</Cta>
      </div>
    );
  return (
    <>
      {posPago.length && prePago.length ? (
        <div className="lp-switch" role="tablist" aria-label="Modalidade de pagamento">
          {(
            [
              ['POS_PAGO', 'Pós-pago', 'paga depois de usar'],
              ['PRE_PAGO', 'Pré-pago', 'desconto à vista'],
            ] as const
          ).map(([valor, nome, dica]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={atual === valor}
              className={atual === valor ? 'is-active' : ''}
              data-testid={'lp-tab-' + valor}
              onClick={() => setAba(valor)}
            >
              {nome}
              <small>{dica}</small>
            </button>
          ))}
        </div>
      ) : null}
      <div className="lp-plans" data-testid="lp-plans">
        {visiveis.map((p) => (
          <PlanoCard
            key={p.planoId}
            plano={p}
            emDestaque={p.planoId === melhor}
            unico={visiveis.length === 1}
          />
        ))}
      </div>
    </>
  );
}

export function AboutPage() {
  useSeo();
  const [menu, setMenu] = useState(false);
  const fechar = () => setMenu(false);
  const links = [
    ['#funcionalidades', 'Funcionalidades'],
    ['#como-funciona', 'Como funciona'],
    ['#planos', 'Planos'],
    ['#duvidas', 'Dúvidas'],
  ] as const;
  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-wrap lp-header-row">
          <Link to="/sobrenos" className="brand" aria-label="AutoCare, início">
            <span className="brand-symbol">
              <CarFront size={22} />
            </span>
            <span>AutoCare</span>
          </Link>
          <nav className={'lp-nav' + (menu ? ' is-open' : '')} aria-label="Seções">
            {links.map(([href, nome]) => (
              <a key={href} href={href} onClick={fechar}>
                {nome}
              </a>
            ))}
            <Link to="/login" className="lp-login" onClick={fechar}>
              Entrar
            </Link>
          </nav>
          <div className="lp-header-actions">
            <ThemeToggle />
            <Link to={CADASTRO} className="button button-primary lp-header-cta">
              Testar grátis
            </Link>
            <button
              type="button"
              className="button button-ghost lp-menu"
              aria-expanded={menu}
              aria-label={menu ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenu((v) => !v)}
            >
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div>
              <p className="eyebrow">SISTEMA PARA ESTACIONAMENTO E LAVA-RÁPIDO</p>
              <h1>
                Do portão ao caixa,
                <br />
                <em>tudo sob controle.</em>
              </h1>
              <p className="lp-lead">
                O AutoCare registra entradas e saídas, lê a placa por foto, imprime o ticket, faz o
                checklist de avarias e cobra por Pix, boleto ou cartão. Tudo num só lugar, no
                celular ou no computador.
              </p>
              <div className="lp-hero-actions">
                <Cta testId="lp-hero-cta">Começar 7 dias grátis</Cta>
                <a href="#planos" className="button button-secondary">
                  Ver planos
                </a>
              </div>
              <ul className="lp-trust">
                <li>
                  <Check size={16} aria-hidden="true" /> Sem cartão de crédito no cadastro
                </li>
                <li>
                  <Check size={16} aria-hidden="true" /> Todas as funcionalidades no teste
                </li>
                <li>
                  <Check size={16} aria-hidden="true" /> Funciona no navegador
                </li>
              </ul>
            </div>
            <figure className="lp-mock" aria-label="Exemplo ilustrativo do painel do AutoCare">
              <div className="lp-mock-bar">
                <span />
                <span />
                <span />
              </div>
              <p className="lp-mock-title">Seu dia, sob controle.</p>
              <div className="lp-mock-metrics">
                <div>
                  <small>No estacionamento</small>
                  <strong>18</strong>
                </div>
                <div>
                  <small>Entradas hoje</small>
                  <strong>42</strong>
                </div>
                <div>
                  <small>Recebido hoje</small>
                  <strong>R$ 1.284</strong>
                </div>
              </div>
              <div className="lp-mock-bars" aria-hidden="true">
                {[46, 62, 38, 74, 58, 88, 70].map((h, i) => (
                  <span key={i} style={{ height: h + '%' }} />
                ))}
              </div>
              <div className="lp-mock-ticket">
                <ScanBadge />
                <div>
                  <small>Placa lida pela foto</small>
                  <strong>BRA2E19</strong>
                </div>
                <span className="lp-mock-ok">Confirmar</span>
              </div>
              <figcaption>Exemplo ilustrativo</figcaption>
            </figure>
          </div>
        </section>

        <section className="lp-section" id="funcionalidades" aria-labelledby="lp-func-title">
          <div className="lp-wrap">
            <p className="eyebrow">FUNCIONALIDADES</p>
            <h2 id="lp-func-title">Feito para a rotina de quem cuida de veículos</h2>
            <p className="lp-sub">
              Menos papel e menos digitação na guarita. Mais controle do pátio e do dinheiro.
            </p>
            <div className="lp-highlights">
              {destaques.map(({ icone: Icone, titulo, texto }) => (
                <article key={titulo} className="lp-highlight">
                  <span className="lp-icon">
                    <Icone size={24} aria-hidden="true" />
                  </span>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </article>
              ))}
            </div>
            <div className="lp-features" data-testid="lp-features">
              {funcionalidades.map(({ icone: Icone, titulo, texto }) => (
                <article key={titulo} className="lp-feature">
                  <Icone size={20} aria-hidden="true" />
                  <div>
                    <h3>{titulo}</h3>
                    <p>{texto}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="lp-section lp-steps-section"
          id="como-funciona"
          aria-labelledby="lp-steps-title"
        >
          <div className="lp-wrap">
            <p className="eyebrow">COMO FUNCIONA</p>
            <h2 id="lp-steps-title">Comece hoje, em três passos</h2>
            <ol className="lp-steps">
              {passos.map((p, i) => (
                <li key={p.titulo}>
                  <span className="lp-step-n">{i + 1}</span>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="lp-section" id="planos" aria-labelledby="lp-plans-title">
          <div className="lp-wrap">
            <p className="eyebrow">PLANOS</p>
            <h2 id="lp-plans-title">Escolha como prefere pagar</h2>
            <p className="lp-sub">
              Todos os planos têm o AutoCare completo e começam com 7 dias grátis.
            </p>
            <Planos />
          </div>
        </section>

        <section className="lp-section" id="duvidas" aria-labelledby="lp-faq-title">
          <div className="lp-wrap lp-faq-wrap">
            <p className="eyebrow">DÚVIDAS</p>
            <h2 id="lp-faq-title">Perguntas frequentes</h2>
            <div className="lp-faq">
              {perguntas.map((q) => (
                <details key={q.pergunta}>
                  <summary>
                    {q.pergunta}
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <p>{q.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-wrap">
            <h2>Pronto para organizar seu estacionamento?</h2>
            <p>Cadastre-se agora e use o AutoCare completo por 7 dias, sem custo.</p>
            <Cta testId="lp-final-cta">Criar minha conta grátis</Cta>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-row">
          <span>© {new Date().getFullYear()} AutoCare · Furlaneti Consultoria</span>
          <Link to="/login">Já sou cliente: entrar</Link>
        </div>
      </footer>
    </div>
  );
}

function ScanBadge() {
  return (
    <span className="lp-icon lp-icon-sm" aria-hidden="true">
      <CarFront size={18} />
    </span>
  );
}

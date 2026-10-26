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

const TITULO = 'CareAuto | Sistema para estacionamento e lava-rápido · 7 dias grátis';
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

const WHATSAPP_HREF =
  'https://wa.me/5511978504405?text=' +
  encodeURIComponent('Quero mais informações sobre o CareAuto');

function WhatsAppFloat() {
  return (
    <a
      className="lp-whatsapp-float"
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar com o CareAuto pelo WhatsApp"
      title="Conversar pelo WhatsApp"
      data-testid="lp-whatsapp"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.496.099-.198.05-.372-.025-.52-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.793.372-.272.297-1.04 1.016-1.04 2.479s1.064 2.875 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.84 9.84 0 0 1-1.511-5.26c.002-5.45 4.438-9.884 9.888-9.884 2.64.001 5.12 1.03 6.984 2.897a9.825 9.825 0 0 1 2.891 6.989c-.003 5.45-4.439 9.884-9.879 9.884m8.4-18.286A11.815 11.815 0 0 0 12.054 0C5.492 0 .15 5.34.147 11.9c-.001 2.096.546 4.14 1.583 5.945L0 24l6.335-1.662a11.94 11.94 0 0 0 5.714 1.454h.005c6.557 0 11.899-5.341 11.902-11.903a11.815 11.815 0 0 0-3.48-8.39z"
        />
      </svg>
    </a>
  );
}

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
          <Link to="/sobrenos" className="brand" aria-label="CareAuto, início">
            <span className="brand-symbol">
              <CarFront size={22} />
            </span>
            <span>CareAuto</span>
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
                O CareAuto registra entradas e saídas, lê a placa por foto, imprime o ticket, faz o
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
            <figure className="lp-mock" aria-label="Exemplo ilustrativo do painel do CareAuto">
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
              Todos os planos têm o CareAuto completo e começam com 7 dias grátis.
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
            <p>Cadastre-se agora e use o CareAuto completo por 7 dias, sem custo.</p>
            <Cta testId="lp-final-cta">Criar minha conta grátis</Cta>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-row">
          <span>© {new Date().getFullYear()} CareAuto · Furlaneti Consultoria</span>
          <Link to="/login">Já sou cliente: entrar</Link>
        </div>
      </footer>
      <WhatsAppFloat />
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

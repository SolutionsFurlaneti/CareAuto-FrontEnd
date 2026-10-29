import {
  CalendarDays,
  CarFront,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Layers,
  LayoutDashboard,
  Plug,
  Printer,
  ScanLine,
  Sparkles,
  Users,
  Wrench,
  KeyRound,
  LogOut,
  Menu,
  LayoutGrid,
  X,
  Search,
  Car,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { Session, Role } from '../stores/authStore';

export type NavigationGroup = 'ACESSO' | 'PRINCIPAL' | 'FINANCEIRO' | 'CONFIGURAÇÕES';
export type MenuMode = 'grid' | 'sidebar';

export interface NavigationItem {
  to: string;
  text: string;
  icon: LucideIcon;
  roles: Role[];
  group: NavigationGroup;
  description: string;
  badge?: string;
}

export interface NavigationSection {
  title: NavigationGroup;
  items: NavigationItem[];
}

export const navigationSections: NavigationSection[] = [
  {
    title: 'ACESSO',
    items: [
      {
        to: '/usuarios',
        text: 'Equipe e acesso',
        icon: Users,
        roles: ['Admin'],
        group: 'ACESSO',
        description: 'Operadores de caixa e turnos',
      },
    ],
  },
  {
    title: 'PRINCIPAL',
    items: [
      {
        to: '/',
        text: 'Visão geral',
        icon: LayoutDashboard,
        roles: ['Admin', 'Operador', 'Financeiro', 'Cliente'],
        group: 'PRINCIPAL',
        description: 'Painel operacional e métricas',
      },
      {
        to: '/estacionamento',
        text: 'Estacionamento',
        icon: Car,
        roles: ['Admin', 'Operador'],
        group: 'PRINCIPAL',
        description: 'Mapa de 30 vagas e pátio ao vivo',
        badge: '30 Vagas',
      },
      {
        to: '/clientes',
        text: 'Clientes',
        icon: UserRound,
        roles: ['Admin', 'Operador'],
        group: 'PRINCIPAL',
        description: 'Mensalistas e contatos',
      },
      {
        to: '/veiculos',
        text: 'Veículos',
        icon: CarFront,
        roles: ['Admin', 'Operador'],
        group: 'PRINCIPAL',
        description: 'Cadastro de placas e modelos',
      },
    ],
  },
  {
    title: 'FINANCEIRO',
    items: [
      {
        to: '/pagamentos',
        text: 'Pagamentos',
        icon: CircleDollarSign,
        roles: ['Admin', 'Financeiro', 'Cliente'],
        group: 'FINANCEIRO',
        description: 'Caixa, Pix, débito e crédito',
        badge: 'PDV',
      },
      {
        to: '/assinaturas',
        text: 'Assinaturas',
        icon: CalendarDays,
        roles: ['Admin', 'Financeiro', 'Cliente'],
        group: 'FINANCEIRO',
        description: 'Cobranças mensais recorrentes',
      },
    ],
  },
  {
    title: 'CONFIGURAÇÕES',
    items: [
      {
        to: '/integracoes',
        text: 'Integrações',
        icon: Plug,
        roles: ['Admin'],
        group: 'CONFIGURAÇÕES',
        description: 'Conectores POS, TEF e cancelas',
      },
      {
        to: '/impressao',
        text: 'Impressão',
        icon: Printer,
        roles: ['Admin'],
        group: 'CONFIGURAÇÕES',
        description: 'Bobina térmica 58/80mm POS',
      },
      {
        to: '/servicos',
        text: 'Serviços',
        icon: Wrench,
        roles: ['Admin', 'Operador', 'Financeiro'],
        group: 'CONFIGURAÇÕES',
        description: 'Configuração de lavagem e extras',
      },
      {
        to: '/precos-servicos',
        text: 'Preços dos serviços',
        icon: FileText,
        roles: ['Admin', 'Operador', 'Financeiro'],
        group: 'CONFIGURAÇÕES',
        description: 'Lavagem, polimento e estadias',
      },
      {
        to: '/tabelas-preco',
        text: 'Tabelas de preços',
        icon: ClipboardList,
        roles: ['Admin', 'Operador', 'Financeiro'],
        group: 'CONFIGURAÇÕES',
        description: 'Tarifários por hora e fração',
      },
      {
        to: '/taxas-dinamicas',
        text: 'Taxas dinâmicas',
        icon: Sparkles,
        roles: ['Admin', 'Operador', 'Financeiro'],
        group: 'CONFIGURAÇÕES',
        description: 'Ajustes automáticos de horário de pico',
      },
      {
        to: '/categorias',
        text: 'Categorias',
        icon: Layers,
        roles: ['Admin', 'Operador', 'Financeiro'],
        group: 'CONFIGURAÇÕES',
        description: 'Carro, Moto, Van e Caminhonete',
      },
      {
        to: '/consultas-placa',
        text: 'Consultas de placa',
        icon: ScanLine,
        roles: ['Admin', 'Operador'],
        group: 'CONFIGURAÇÕES',
        description: 'Pesquisa rápida e histórico',
      },
    ],
  },
];

const roleLabel = (role: Role) =>
  role === 'Admin' ? 'Administrador' : role === 'Operador' ? 'Operador' : role;

function ProfileFooter({ session, onLogout }: { session: Session | null; onLogout: () => void }) {
  if (!session) return null;
  return (
    <div className="flex min-w-0 items-center gap-2 border-t border-app-line px-3 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-app-line bg-app-muted text-[10px] font-bold text-care-mint-deep">
        {session.userName.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-[11px] leading-tight text-app-ink">
          {session.userName}
        </strong>
        <span className="block truncate text-[9px] leading-tight text-app-faint">
          {session.roles.map(roleLabel).join(' · ')}
        </span>
      </div>
      {session.authMode === 'password' && (
        <NavLink
          to="/trocar-senha"
          aria-label="Alterar minha senha"
          title="Alterar minha senha"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-app-faint transition hover:bg-app-muted hover:text-app-ink"
        >
          <KeyRound size={15} />
        </NavLink>
      )}
      <button
        type="button"
        onClick={onLogout}
        aria-label="Sair da conta"
        title="Sair da conta"
        data-testid="logout"
        className="grid size-9 shrink-0 place-items-center rounded-xl text-app-faint transition hover:bg-app-muted hover:text-app-ink"
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}

export function GridModuleMenu({
  sections,
  session,
  onClose,
  onSwitchMode,
  onLogout,
}: {
  sections: NavigationSection[];
  session: Session | null;
  onClose: () => void;
  onSwitchMode: () => void;
  onLogout: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<NavigationGroup | 'TODOS'>('TODOS');
  const filters: { label: string; value: NavigationGroup | 'TODOS' }[] = [
    { label: 'Todos os Módulos', value: 'TODOS' },
    { label: 'Principal', value: 'PRINCIPAL' },
    { label: 'Financeiro / PDV', value: 'FINANCEIRO' },
    { label: 'Configurações', value: 'CONFIGURAÇÕES' },
    { label: 'Acesso', value: 'ACESSO' },
  ];
  const allItems = sections.flatMap((section) => section.items);
  const filteredItems = allItems.filter((item) => {
    const matchesFilter = filter === 'TODOS' || item.group === filter;
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    const matchesSearch =
      !normalizedSearch ||
      `${item.text} ${item.description}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="pos-grid-menu flex h-full min-h-0 flex-col bg-app-surface text-app-ink">
      <div className="pos-grid-menu-header shrink-0 border-b border-app-line px-3 pt-3 pb-2.5 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <CarFront size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-bold leading-tight text-app-ink">
                Menu do CareAuto POS
              </h2>
              <span
                data-testid="estabelecimento-atual"
                className="hidden max-w-32 truncate rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 min-[360px]:inline"
              >
                {session?.estabelecimentoNome || 'Estacionamento'}
              </span>
            </div>
            <p className="m-0 text-[10px] leading-tight text-app-faint">
              Toque no ícone desejado para abrir rapidamente
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchMode}
            aria-label="Alternar para o menu lateral"
            title="Menu lateral"
            className="hidden h-9 shrink-0 items-center gap-1.5 rounded-lg border border-app-line px-2 text-[10px] font-semibold text-app-dim transition hover:bg-app-muted sm:inline-flex"
          >
            <Menu size={13} />
            <span>Menu lateral</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-app-faint transition hover:bg-app-muted hover:text-app-ink"
          >
            <X size={17} />
          </button>
        </div>
        <label className="relative mt-3 block">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar funcionalidade ou serviço..."
            aria-label="Buscar funcionalidade ou serviço"
            className="h-10 w-full rounded-xl border border-app-line bg-app-bg pr-3 pl-9 text-xs text-app-ink placeholder:text-app-faint focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </label>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5" aria-label="Filtrar módulos">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={`min-h-8 shrink-0 rounded-full px-2.5 text-[10px] font-semibold transition ${
                filter === item.value
                  ? 'bg-emerald-800 text-white dark:bg-emerald-700'
                  : 'bg-app-muted text-app-dim hover:text-app-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pos-grid-menu-items min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {filteredItems.length ? (
          <div className="grid grid-cols-2 content-start gap-2 min-[400px]:grid-cols-3 sm:gap-2.5">
            {filteredItems.map((item) => (
              <NavLink
                end={item.to === '/'}
                key={item.to}
                to={item.to}
                onClick={onClose}
                data-testid={'nav-' + (item.to.slice(1) || 'overview')}
                className={({ isActive }) =>
                  `pos-grid-menu-card group relative flex min-h-[90px] min-w-0 flex-col justify-between rounded-2xl border p-2.5 text-app-ink transition hover:border-emerald-600 hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:min-h-[94px] sm:p-3 ${
                    isActive
                      ? 'border-emerald-600 bg-emerald-900/15 dark:bg-emerald-900/30'
                      : 'border-app-line bg-app-bg'
                  }`
                }
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-app-muted text-care-mint-deep transition group-hover:bg-emerald-100 group-hover:text-emerald-800 dark:group-hover:bg-emerald-950 dark:group-hover:text-emerald-200">
                    <item.icon size={16} aria-hidden="true" />
                  </span>
                  {item.badge && (
                    <span className="max-w-14 truncate rounded-md bg-emerald-400 px-1.5 py-0.5 text-[8px] font-bold leading-tight text-emerald-950">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="block min-w-0">
                  <strong className="block truncate text-[11px] font-bold leading-tight text-app-ink">
                    {item.text}
                  </strong>
                  <span className="mt-0.5 line-clamp-2 block text-[9px] leading-tight text-app-faint">
                    {item.description}
                  </span>
                </span>
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="grid min-h-32 place-items-center px-6 text-center text-xs text-app-faint">
            Nenhuma funcionalidade encontrada.
          </div>
        )}
      </div>
      <ProfileFooter session={session} onLogout={onLogout} />
    </div>
  );
}

export function SidebarNavigation({
  sections,
  session,
  onClose,
  onSwitchMode,
  onLogout,
}: {
  sections: NavigationSection[];
  session: Session | null;
  onClose: () => void;
  onSwitchMode: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-app-surface px-3 py-5 text-app-ink">
      <div className="flex items-center gap-3 px-2 pb-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          <CarFront size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block text-lg font-bold tracking-tight text-app-ink">CareAuto</strong>
          <span className="block text-[9px] font-semibold tracking-[0.16em] text-app-faint">
            GESTÃO AUTOMOTIVA
          </span>
        </div>
        <button
          type="button"
          onClick={onSwitchMode}
          aria-label="Alternar para a grade PDV"
          title="Grade PDV"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-app-line text-app-dim transition hover:bg-app-muted"
        >
          <LayoutGrid size={16} />
        </button>
      </div>
      <div
        data-testid="estabelecimento-atual"
        className="mb-3 rounded-xl border border-app-line bg-app-bg px-3 py-2 text-xs font-semibold text-app-ink"
      >
        {session?.estabelecimentoNome || 'Estacionamento'}
      </div>
      <nav aria-label="Navegação principal" className="min-h-0 flex-1 overflow-y-auto">
        {sections.map((section) =>
          section.items.length ? (
            <div className="mb-4" key={section.title}>
              <h3 className="mb-1.5 px-3 text-[9px] font-bold tracking-[0.16em] text-app-faint">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    end={item.to === '/'}
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    data-testid={'nav-' + (item.to.slice(1) || 'overview')}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs font-medium transition hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        isActive
                          ? 'bg-emerald-100 font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
                          : 'text-app-dim hover:text-app-ink'
                      }`
                    }
                  >
                    <item.icon size={17} aria-hidden="true" />
                    <span className="truncate">{item.text}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ) : null,
        )}
      </nav>
      <ProfileFooter session={session} onLogout={onLogout} />
    </div>
  );
}

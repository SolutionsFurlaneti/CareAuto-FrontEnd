import { useState, useEffect, Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Drawer, useMediaQuery } from '@mui/material';
import {
  LayoutDashboard,
  CarFront,
  Users,
  Layers,
  Wrench,
  CircleDollarSign,
  CalendarDays,
  ReceiptText,
  ScanLine,
  Menu,
  LogOut,
  ChevronRight,
  Sparkles,
  Plug,
  Printer,
  Plus,
} from 'lucide-react';
import { m, useReducedMotion } from 'motion/react';
import { useAuthStore, hasRole, type Role } from '../stores/authStore';
import { ThemeToggle } from './ThemeToggle';
import { Button, Skeleton } from '../ui';
import { signOut } from '../features/auth/api';
import { toast } from 'sonner';
import { EntryModal } from '../features/stays/EntryModal';
const sections = [
  {
    title: 'ACESSO',
    items: [{ to: '/usuarios', text: 'Equipe e acesso', icon: Users, roles: ['Admin'] }],
  },
  {
    title: 'PRINCIPAL',
    items: [
      {
        to: '/',
        text: 'Visão geral',
        icon: LayoutDashboard,
        roles: ['Admin', 'Operador', 'Financeiro', 'Cliente'],
      },
      {
        to: '/estacionamento',
        text: 'Estacionamento',
        icon: CarFront,
        roles: ['Admin', 'Operador'],
      },
      { to: '/clientes', text: 'Clientes', icon: Users, roles: ['Admin', 'Operador'] },
      { to: '/veiculos', text: 'Veículos', icon: CarFront, roles: ['Admin', 'Operador'] },
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
      },
      {
        to: '/assinaturas',
        text: 'Assinaturas',
        icon: CalendarDays,
        roles: ['Admin', 'Financeiro', 'Cliente'],
      },
    ],
  },
  {
    title: 'CONFIGURAÇÕES',
    items: [
      { to: '/integracoes', text: 'Integrações', icon: Plug, roles: ['Admin'] },
      { to: '/impressao', text: 'Impressão', icon: Printer, roles: ['Admin'] },
      {
        to: '/servicos',
        text: 'Serviços',
        icon: Wrench,
        roles: ['Admin', 'Operador', 'Financeiro'],
      },
      {
        to: '/precos-servicos',
        text: 'Preços dos serviços',
        icon: ReceiptText,
        roles: ['Admin', 'Operador', 'Financeiro'],
      },
      {
        to: '/tabelas-preco',
        text: 'Tabelas de preços',
        icon: ReceiptText,
        roles: ['Admin', 'Operador', 'Financeiro'],
      },
      {
        to: '/taxas-dinamicas',
        text: 'Taxas dinâmicas',
        icon: Sparkles,
        roles: ['Admin', 'Operador', 'Financeiro'],
      },
      {
        to: '/categorias',
        text: 'Categorias',
        icon: Layers,
        roles: ['Admin', 'Operador', 'Financeiro'],
      },
      {
        to: '/consultas-placa',
        text: 'Consultas de placa',
        icon: ScanLine,
        roles: ['Admin', 'Operador'],
      },
    ],
  },
];
export function AppShell() {
  const [open, setOpen] = useState(false);
  const [globalEntry, setGlobalEntry] = useState(false);
  const desktop = useMediaQuery('(min-width:900px)');
  const session = useAuthStore((s) => s.session);
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  const title =
    sections
      .flatMap((s) => s.items)
      .find(
        (i) =>
          i.to === location.pathname || (i.to !== '/' && location.pathname.startsWith(i.to + '/')),
      )?.text || 'AutoCare';
  const navigation = (
    <div className="sidebar-inner">
      <NavLink to="/" onClick={() => setOpen(false)} className="brand" data-testid="brand">
        <span className="brand-symbol">
          <CarFront size={24} />
        </span>
        <span>
          Auto<span className="brand-soft">Care</span>
          <small>GESTÃO AUTOMOTIVA</small>
        </span>
      </NavLink>
      <p className="tenant-name" data-testid="estabelecimento-atual">
        {session?.estabelecimentoNome}
      </p>
      <nav aria-label="Navegação principal">
        {sections.map((section) => {
          const items = section.items.filter(
            (i) =>
              hasRole(session?.roles || [], i.roles as Role[]) &&
              (i.to !== '/usuarios' || session?.authMode === 'password'),
          );
          return items.length ? (
            <div className="nav-section" key={section.title}>
              <p>{section.title}</p>
              {items.map((item) => (
                <NavLink
                  end={item.to === '/'}
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  data-testid={'nav-' + (item.to.slice(1) || 'overview')}
                  className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                >
                  <item.icon size={18} />
                  <span>{item.text}</span>
                </NavLink>
              ))}
            </div>
          ) : null;
        })}
      </nav>
      {session?.authMode === 'password' && (
        <NavLink className="nav-item" data-testid="change-password" to="/trocar-senha">
          Alterar minha senha
        </NavLink>
      )}
      <div className="sidebar-bottom">
        <span className="avatar">{session?.userName.slice(0, 2).toUpperCase()}</span>
        <div>
          <strong>{session?.userName}</strong>
          <small>
            {session?.roles
              .map((r) => (r === 'Admin' ? 'Administrador' : r === 'Operador' ? 'Funcionário' : r))
              .join(' · ')}
          </small>
        </div>
        <Button
          variant="ghost"
          aria-label="Sair da conta"
          data-testid="logout"
          onClick={async () => {
            try {
              await signOut();
            } catch {
              toast.error(
                'A sessão local foi encerrada, mas não foi possível encerrar as sessões no servidor.',
              );
            }
            navigate('/login', { replace: true });
          }}
        >
          <LogOut size={18} />
        </Button>
      </div>
    </div>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <Drawer
        variant={desktop ? 'permanent' : 'temporary'}
        open={desktop || open}
        onClose={() => setOpen(false)}
        className="sidebar"
        PaperProps={{ className: 'sidebar-paper' }}
      >
        {navigation}
      </Drawer>
      <div className="workspace">
        <header className="topbar">
          <div>
            <Button
              variant="ghost"
              aria-label="Abrir menu"
              data-testid="nav-open"
              className="mobile-menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </Button>
            <span className="breadcrumb-brand" title={session?.estabelecimentoNome}>
              {session?.estabelecimentoNome}
            </span>
            <ChevronRight size={14} />
            <span>{title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hasRole(session?.roles || [], ['Admin', 'Operador']) && (
              <Button
                variant="primary"
                className="topbar-entry"
                aria-label="Nova entrada"
                onClick={() => setGlobalEntry(true)}
              >
                <Plus size={16} />
                <span className="topbar-entry-label">Nova entrada</span>
              </Button>
            )}
            <span className="topbar-date">
              {new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                timeZone: 'America/Sao_Paulo',
              }).format(new Date())}
            </span>
            <ThemeToggle />
            <span className="avatar avatar-top">{session?.userName.slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        <m.main
          key={location.pathname}
          id="main"
          className="main-content"
          initial={reduced ? false : { opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <Suspense fallback={<Skeleton />}>
            <Outlet />
          </Suspense>
        </m.main>
        <footer className="app-footer">
          <span>AutoCare Manager</span>
          <span>Cuidado com os veículos. Clareza na gestão.</span>
        </footer>
      </div>
      {globalEntry && <EntryModal onClose={() => setGlobalEntry(false)} />}
    </div>
  );
}

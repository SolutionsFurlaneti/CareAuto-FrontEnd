import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Drawer, useMediaQuery } from '@mui/material';
import {
  Building2,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Mail,
  Menu,
  Plug,
  Store,
  Tags,
} from 'lucide-react';
import { m, useReducedMotion } from 'motion/react';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Button, Skeleton } from '../../ui';
import { useBackofficeStore } from './store';
import { sairDoBackoffice } from './BackofficePasswordPage';

const items = [
  { to: '/backoffice', text: 'Visão geral', icon: LayoutDashboard, id: 'overview' },
  { to: '/backoffice/assinantes', text: 'Assinantes', icon: Store, id: 'assinantes' },
  { to: '/backoffice/planos', text: 'Planos', icon: Tags, id: 'planos' },
  { to: '/backoffice/cobrancas', text: 'Cobranças', icon: CircleDollarSign, id: 'cobrancas' },
  { to: '/backoffice/marketing', text: 'Google Ads', icon: Megaphone, id: 'marketing', end: true },
  { to: '/backoffice/marketing/meta-ads', text: 'Meta Ads', icon: Megaphone, id: 'meta-ads' },
  { to: '/backoffice/emails', text: 'E-mails', icon: Mail, id: 'emails' },
  { to: '/backoffice/integracoes', text: 'Integrações', icon: Plug, id: 'integracoes' },
];

/** Layout do backoffice: mesmo design system do app, navegação própria e sessão separada. */
export function BackofficeShell() {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery('(min-width:900px)');
  const session = useBackofficeStore((s) => s.session);
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  useEffect(() => setOpen(false), [location.pathname]);
  const title =
    [...items]
      .reverse()
      .find((i) => location.pathname === i.to || location.pathname.startsWith(i.to + '/'))?.text ??
    'Backoffice';
  const navigation = (
    <div className="sidebar-inner">
      <NavLink to="/backoffice" className="brand" data-testid="bo-brand">
        <span className="brand-symbol">
          <Building2 size={24} />
        </span>
        <span>
          Auto<span className="brand-soft">Care</span>
          <small>BACKOFFICE</small>
        </span>
      </NavLink>
      <p className="tenant-name">Gestão da plataforma</p>
      <nav aria-label="Navegação do backoffice">
        <div className="nav-section">
          <p>PLATAFORMA</p>
          {items.map((item) => (
            <NavLink
              end={item.to === '/backoffice' || ('end' in item && item.end)}
              key={item.to}
              to={item.to}
              data-testid={'bo-nav-' + item.id}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <item.icon size={18} />
              <span>{item.text}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      <NavLink className="nav-item" data-testid="bo-change-password" to="/backoffice/trocar-senha">
        Alterar minha senha
      </NavLink>
      <div className="sidebar-bottom">
        <span className="avatar">{session?.login.slice(0, 2).toUpperCase()}</span>
        <div>
          <strong>{session?.nome}</strong>
          <small>{session?.login}</small>
        </div>
        <Button
          variant="ghost"
          aria-label="Sair do backoffice"
          data-testid="bo-logout"
          onClick={async () => {
            await sairDoBackoffice();
            navigate('/backoffice/login', { replace: true });
          }}
        >
          <LogOut size={18} />
        </Button>
      </div>
    </div>
  );
  return (
    <div className="app-shell backoffice-shell">
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
            <span className="breadcrumb-brand">Backoffice</span>
            <ChevronRight size={14} />
            <span>{title}</span>
          </div>
          <div>
            <ThemeToggle />
            <span className="avatar avatar-top">{session?.login.slice(0, 1).toUpperCase()}</span>
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
          <span>AutoCare Backoffice</span>
          <span>Assinaturas, cobranças e crescimento da plataforma.</span>
        </footer>
      </div>
    </div>
  );
}

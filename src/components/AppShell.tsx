import { useEffect, useState, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Drawer, useMediaQuery } from '@mui/material';
import { ChevronDown, ChevronRight, LayoutGrid, Menu, PanelLeft, Plus } from 'lucide-react';
import { m, useReducedMotion } from 'motion/react';
import { useAuthStore, hasRole, type Role } from '../stores/authStore';
import { ThemeToggle } from './ThemeToggle';
import { Button, Skeleton } from '../ui';
import { signOut } from '../features/auth/api';
import { toast } from 'sonner';
import { EntryModal } from '../features/stays/EntryModal';
import {
  GridModuleMenu,
  SidebarNavigation,
  navigationSections,
  type MenuMode,
} from './ModuleNavigation';

const roleVisibleSections = (roles: Role[], authMode?: string) =>
  navigationSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => hasRole(roles, item.roles) && (item.to !== '/usuarios' || authMode === 'password'),
    ),
  }));

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [globalEntry, setGlobalEntry] = useState(false);
  const desktop = useMediaQuery('(min-width:900px)');
  const session = useAuthStore((s) => s.session);
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [menuMode, setMenuMode] = useState<MenuMode>(() => {
    const saved = window.localStorage.getItem('AutoCareManager-menu-mode');
    if (saved === 'grid' || saved === 'sidebar') return saved;
    return window.matchMedia('(min-width:900px)').matches ? 'sidebar' : 'grid';
  });
  const isPermanent = desktop && menuMode === 'sidebar';
  const sections = roleVisibleSections(session?.roles || [], session?.authMode);

  useEffect(() => {
    window.localStorage.setItem('AutoCareManager-menu-mode', menuMode);
  }, [menuMode]);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const title =
    navigationSections
      .flatMap((section) => section.items)
      .find(
        (item) =>
          item.to === location.pathname ||
          (item.to !== '/' && location.pathname.startsWith(item.to + '/')),
      )?.text || 'CareAuto';

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      toast.error(
        'A sessão local foi encerrada, mas não foi possível encerrar as sessões no servidor.',
      );
    }
    navigate('/login', { replace: true });
  };

  const switchMenuMode = () => {
    setMenuMode((current) => (current === 'grid' ? 'sidebar' : 'grid'));
    setOpen(true);
  };

  const openNavigation = () => {
    if (isPermanent) setMenuMode('grid');
    setOpen(true);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <Drawer
        variant={isPermanent ? 'permanent' : 'temporary'}
        open={isPermanent || open}
        onClose={() => setOpen(false)}
        className="sidebar"
        PaperProps={{
          className: menuMode === 'grid' ? 'sidebar-paper menu-grid-paper' : 'sidebar-paper',
          'aria-label': menuMode === 'grid' ? 'Menu de módulos do CareAuto' : 'Navegação CareAuto',
        }}
      >
        {menuMode === 'grid' ? (
          <GridModuleMenu
            sections={sections}
            session={session}
            onClose={() => setOpen(false)}
            onSwitchMode={switchMenuMode}
            onLogout={handleLogout}
          />
        ) : (
          <SidebarNavigation
            sections={sections}
            session={session}
            onClose={() => setOpen(false)}
            onSwitchMode={switchMenuMode}
            onLogout={handleLogout}
          />
        )}
      </Drawer>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-leading">
            {!isPermanent && (
              <Button
                variant="ghost"
                aria-label="Abrir menu"
                aria-expanded={open}
                data-testid="nav-open"
                className="mobile-menu"
                onClick={openNavigation}
              >
                <Menu size={22} />
              </Button>
            )}
            <span className="breadcrumb-brand" title={session?.estabelecimentoNome}>
              {session?.estabelecimentoNome}
            </span>
            <ChevronRight aria-hidden="true" size={14} />
            <button
              type="button"
              className="topbar-title"
              onClick={openNavigation}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={`Abrir menu: ${title}`}
            >
              <span>{title}</span>
              <ChevronDown size={13} aria-hidden="true" />
            </button>
          </div>
          <div className="topbar-actions">
            <Button
              variant="ghost"
              className="menu-mode-toggle"
              aria-label={
                menuMode === 'grid' ? 'Alternar para menu lateral' : 'Alternar para grade PDV'
              }
              title={menuMode === 'grid' ? 'Menu lateral' : 'Grade PDV'}
              onClick={switchMenuMode}
            >
              {menuMode === 'grid' ? <PanelLeft size={17} /> : <LayoutGrid size={17} />}
              <span>{menuMode === 'grid' ? 'Menu lateral' : 'Grade PDV'}</span>
            </Button>
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
          <span>CareAuto</span>
          <span>Cuidado com os veículos. Clareza na gestão.</span>
        </footer>
      </div>
      {globalEntry && <EntryModal onClose={() => setGlobalEntry(false)} />}
    </div>
  );
}

import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { AppShell } from './components/AppShell';
import { useAuthStore, hasRole, type Role } from './stores/authStore';
import { LoginPage } from './features/auth/LoginPage';
import { CallbackPage } from './features/auth/CallbackPage';
import { Skeleton } from './ui';
import { RequireBackoffice } from './features/backoffice/RequireBackoffice';
const UsersPage = lazy(() =>
  import('./features/users/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const Integrations = lazy(() =>
  import('./features/integrations/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage })),
);
const IntegrationDetail = lazy(() =>
  import('./features/integrations/IntegrationDetailPage').then((m) => ({
    default: m.IntegrationDetailPage,
  })),
);
const Printing = lazy(() =>
  import('./features/printing/PrintingPage').then((m) => ({ default: m.PrintingPage })),
);
const About = lazy(() =>
  import('./features/landing/AboutPage').then((m) => ({ default: m.AboutPage })),
);
const Setup = lazy(() =>
  import('./features/auth/SetupPage').then((m) => ({ default: m.SetupPage })),
);
const Recovery = lazy(() =>
  import('./features/auth/RecoveryPage').then((m) => ({ default: m.RecoveryPage })),
);
const ChangePassword = lazy(() =>
  import('./features/auth/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })),
);
const Overview = lazy(() =>
  import('./features/overview/OverviewPage').then((m) => ({ default: m.OverviewPage })),
);
const Stays = lazy(() =>
  import('./features/stays/StaysPage').then((m) => ({ default: m.StaysPage })),
);
const Clients = lazy(() =>
  import('./features/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })),
);
const Vehicles = lazy(() =>
  import('./features/vehicles/VehiclesPage').then((m) => ({ default: m.VehiclesPage })),
);
const Categories = lazy(() =>
  import('./features/categories/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
);
const Prices = lazy(() =>
  import('./features/prices/PricesPage').then((m) => ({ default: m.PricesPage })),
);
const Rates = lazy(() =>
  import('./features/rates/RatesPage').then((m) => ({ default: m.RatesPage })),
);
const Services = lazy(() =>
  import('./features/services/ServicesPage').then((m) => ({ default: m.ServicesPage })),
);
const ServicePrices = lazy(() =>
  import('./features/serviceprices/ServicePricesPage').then((m) => ({
    default: m.ServicePricesPage,
  })),
);
const Payments = lazy(() =>
  import('./features/payments/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
const Subscriptions = lazy(() =>
  import('./features/subscriptions/SubscriptionsPage').then((m) => ({
    default: m.SubscriptionsPage,
  })),
);
const lazyBackoffice = <K extends string>(name: K) =>
  lazy(() =>
    import('./features/backoffice/routes').then((m) => ({ default: m[name as keyof typeof m] })),
  );
const BackofficeLogin = lazyBackoffice('BackofficeLoginPage');
const BackofficePassword = lazyBackoffice('BackofficePasswordPage');
const BackofficeShell = lazyBackoffice('BackofficeShell');
const BackofficeOverview = lazyBackoffice('BackofficeOverviewPage');
const BackofficeSubscribers = lazyBackoffice('BackofficeSubscribersPage');
const BackofficePlans = lazyBackoffice('BackofficePlansPage');
const BackofficeCharges = lazyBackoffice('BackofficeChargesPage');
const BackofficeMarketing = lazyBackoffice('BackofficeMarketingPage');
const BackofficeMetaAds = lazyBackoffice('BackofficeMetaAdsPage');
const BackofficeIntegrations = lazyBackoffice('BackofficeIntegrationsPage');
const BackofficeEmails = lazyBackoffice('BackofficeEmailsPage');
const Consultations = lazy(() =>
  import('./features/consultations/ConsultationsPage').then((m) => ({
    default: m.ConsultationsPage,
  })),
);
function Access({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const own = useAuthStore((s) => s.session?.roles || []);
  return hasRole(own, roles) ? children : <Navigate to="/" replace />;
}
const operation: Role[] = ['Admin', 'Operador'];
const config: Role[] = ['Admin', 'Operador', 'Financeiro'];
const financial: Role[] = ['Admin', 'Financeiro', 'Cliente'];
export function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-senha" element={<Recovery />} />
        <Route path="/sobrenos" element={<About />} />
        <Route path="/primeiro-acesso" element={<Setup />} />
        <Route
          path="/trocar-senha"
          element={
            <RequireAuth>
              <ChangePassword />
            </RequireAuth>
          }
        />
        <Route path="/auth/callback" element={<CallbackPage />} />
        {/* Backoffice da plataforma: sessão e layout próprios, fora do RequireAuth dos estacionamentos. */}
        <Route path="/backoffice/login" element={<BackofficeLogin />} />
        <Route
          path="/backoffice/trocar-senha"
          element={
            <RequireBackoffice allowPasswordChange>
              <BackofficePassword />
            </RequireBackoffice>
          }
        />
        <Route
          path="/backoffice"
          element={
            <RequireBackoffice>
              <BackofficeShell />
            </RequireBackoffice>
          }
        >
          <Route index element={<BackofficeOverview />} />
          <Route path="assinantes" element={<BackofficeSubscribers />} />
          <Route path="planos" element={<BackofficePlans />} />
          <Route path="cobrancas" element={<BackofficeCharges />} />
          <Route path="marketing" element={<BackofficeMarketing />} />
          <Route path="marketing/meta-ads" element={<BackofficeMetaAds />} />
          <Route path="integracoes" element={<BackofficeIntegrations />} />
          <Route path="emails" element={<BackofficeEmails />} />
          <Route path="*" element={<Navigate to="/backoffice" replace />} />
        </Route>
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Overview />} />
          <Route
            path="/estacionamento"
            element={
              <Access roles={operation}>
                <Stays />
              </Access>
            }
          />
          <Route
            path="/clientes"
            element={
              <Access roles={operation}>
                <Clients />
              </Access>
            }
          />
          <Route
            path="/veiculos"
            element={
              <Access roles={operation}>
                <Vehicles />
              </Access>
            }
          />
          <Route
            path="/categorias"
            element={
              <Access roles={config}>
                <Categories />
              </Access>
            }
          />
          <Route
            path="/tabelas-preco"
            element={
              <Access roles={config}>
                <Prices />
              </Access>
            }
          />
          <Route
            path="/taxas-dinamicas"
            element={
              <Access roles={config}>
                <Rates />
              </Access>
            }
          />
          <Route
            path="/servicos"
            element={
              <Access roles={config}>
                <Services />
              </Access>
            }
          />
          <Route
            path="/precos-servicos"
            element={
              <Access roles={config}>
                <ServicePrices />
              </Access>
            }
          />
          <Route
            path="/pagamentos"
            element={
              <Access roles={financial}>
                <Payments />
              </Access>
            }
          />
          <Route
            path="/assinaturas"
            element={
              <Access roles={financial}>
                <Subscriptions />
              </Access>
            }
          />
          <Route
            path="/consultas-placa"
            element={
              <Access roles={operation}>
                <Consultations />
              </Access>
            }
          />
          <Route
            path="/usuarios"
            element={
              <Access roles={['Admin']}>
                <UsersPage />
              </Access>
            }
          />
          <Route
            path="/integracoes"
            element={
              <Access roles={['Admin']}>
                <Integrations />
              </Access>
            }
          />
          <Route
            path="/impressao"
            element={
              <Access roles={['Admin']}>
                <Printing />
              </Access>
            }
          />
          <Route
            path="/integracoes/:integracao"
            element={
              <Access roles={['Admin']}>
                <IntegrationDetail />
              </Access>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

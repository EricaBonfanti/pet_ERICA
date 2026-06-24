import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import FinalizarCadastro from '@/pages/FinalizarCadastro';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Pets from '@/pages/Pets';
import Agendamentos from '@/pages/Agendamentos';
import Clientes from '@/pages/Clientes';
import Auditoria from '@/pages/Auditoria';
import VerificarAcesso from '@/pages/VerificarAcesso';
import Planos from '@/pages/Planos';
import Pagamentos from '@/pages/Pagamentos';
import CarteiraVacinas from '@/pages/CarteiraVacinas';
import Notificacoes from '@/pages/Notificacoes';
import Funcionarios from '@/pages/Funcionarios';
import Historico from '@/pages/Historico';
import EditarPerfil from '@/pages/EditarPerfil';

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();

  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verificar-acesso', '/finalizar-cadastro'];
  const isOnPublicPath = publicPaths.some((p) => location.pathname.startsWith(p)) || location.pathname.startsWith('/cadastro/');

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError && !isOnPublicPath) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redireciona via React Router (sem reload de página, sem risco de loop por window.location)
      return <Navigate to="/login" replace />;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/cadastro/:slug" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/finalizar-cadastro" element={<FinalizarCadastro />} />
      <Route path="/verificar-acesso" element={<VerificarAcesso />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout user={user} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pets" element={<Pets />} />
          <Route path="/agendamentos" element={<Agendamentos />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/auditoria" element={<Auditoria />} />
          <Route path="/planos" element={<Planos />} />
          <Route path="/pagamentos" element={<Pagamentos />} />
          <Route path="/carteira-vacinas" element={<CarteiraVacinas />} />
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/funcionarios" element={<Funcionarios />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/editar-perfil" element={<EditarPerfil />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
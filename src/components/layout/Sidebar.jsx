import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/supabaseClient';
import {
  LayoutDashboard,
  CalendarDays,
  PawPrint,
  Users,
  LogOut,
  Menu,
  X,
  Shield,
  CreditCard,
  Syringe,
  Bell,
  Clock,
  Settings,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canManageUsers, ROLE_LABELS } from '@/lib/roleUtils';
import { motion, AnimatePresence } from 'framer-motion';
import LogoIcon, { LogoText } from '@/components/Logo';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: 'all' },
  { path: '/agendamentos', label: 'Agendamentos', icon: CalendarDays, roles: 'all' },
  { path: '/pets', label: 'Meus Pets', icon: PawPrint, roles: ['cliente'] },
  { path: '/pets', label: 'Pets', icon: PawPrint, roles: ['funcionario', 'dono', 'admin'] },
  { path: '/clientes', label: 'Clientes', icon: Users, roles: ['funcionario', 'dono', 'admin'] },
  { path: '/planos', label: 'Planos', icon: CreditCard, roles: 'all' },
  { path: '/pagamentos', label: 'Pagamentos', icon: CreditCard, roles: ['funcionario', 'dono', 'admin'] },
  { path: '/carteira-vacinas', label: 'Carteira Vacinas', icon: Syringe, roles: 'all' },
  { path: '/historico', label: 'Histórico', icon: Clock, roles: ['cliente'] },
  { path: '/funcionarios', label: 'Funcionários', icon: UserPlus, roles: ['dono', 'admin'] },
  { path: '/auditoria', label: 'Auditoria', icon: Shield, roles: ['dono', 'admin'] },
  { path: '/notificacoes', label: 'Notificações', icon: Bell, roles: 'all' },
  { path: '/editar-perfil', label: 'Editar Perfil', icon: Settings, roles: 'all' },
];

export default function Sidebar({ user, mobileOpen, setMobileOpen, petShop }) {
  const location = useLocation();
  const role = user?.role || 'cliente';

  const filteredNav = navItems.filter(
    (item) => item.roles === 'all' || item.roles.includes(role)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#2E75B6] to-[#1E5A94]">
      {/* Logo */}
      <div className="p-5 pb-4">
        <Link to="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
            <LogoIcon className="w-7 h-7" variant="white" />
          </div>
          <LogoText className="text-lg !text-white" />
        </Link>
        {petShop?.nome && (
          <p className="text-[11px] text-white/60 truncate mt-2 pl-1">{petShop.nome}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-[#2E75B6] shadow-sm'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 mt-2">
        <div className="flex items-center gap-3 mb-3 bg-white/10 rounded-xl p-3">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-[#2E75B6]">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.full_name || 'Usuário'}
            </p>
            <p className="text-xs text-white/60">
              {ROLE_LABELS[role] || 'Cliente'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => base44.auth.logout()}
        >
          <LogOut className="w-4 h-4 mr-2" strokeWidth={1.75} />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile toggle */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="bg-white shadow-sm border-slate-200 rounded-xl"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 z-50 shadow-xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
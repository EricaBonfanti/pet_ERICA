import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  PawPrint,
  Users,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const roleTabs = {
  cliente: [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/agendamentos', label: 'Agendamentos', icon: CalendarDays },
    { path: '/pets', label: 'Meus Pets', icon: PawPrint },
  ],
  funcionario: [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/agendamentos', label: 'Agendamentos', icon: CalendarDays },
    { path: '/pets', label: 'Pets', icon: PawPrint },
    { path: '/clientes', label: 'Clientes', icon: Users },
  ],
  dono: [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/agendamentos', label: 'Agendamentos', icon: CalendarDays },
    { path: '/pets', label: 'Pets', icon: PawPrint },
    { path: '/clientes', label: 'Clientes', icon: Users },
    { path: '/auditoria', label: 'Auditoria', icon: Shield },
  ],
  admin: [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/agendamentos', label: 'Agendamentos', icon: CalendarDays },
    { path: '/pets', label: 'Pets', icon: PawPrint },
    { path: '/clientes', label: 'Clientes', icon: Users },
    { path: '/auditoria', label: 'Auditoria', icon: Shield },
  ],
};

export default function RoleTabs({ role }) {
  const location = useLocation();
  const tabs = roleTabs[role] || roleTabs.cliente;

  return (
    <nav className="flex gap-0 overflow-x-auto scrollbar-hide" aria-label="Abas">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.path + tab.label}
            to={tab.path}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
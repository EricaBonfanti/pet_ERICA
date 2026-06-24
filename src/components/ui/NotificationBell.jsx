import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

export default function NotificationBell() {
  const { user } = useAuth();

  const { data: notificacoes } = useQuery({
    queryKey: ['notificacoes-bell', user?.id],
    queryFn: () =>
      base44.entities.Notificacao.filter(
        { id_usuario: user?.id, lida: false },
        '-created_date',
        50
      ),
    enabled: !!user?.id,
  });

  const naoLidas = notificacoes?.length || 0;

  return (
    <Link
      to="/notificacoes"
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[#F1F5F9] transition-colors"
    >
      <Bell className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
      {naoLidas > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
          {naoLidas > 9 ? '9+' : naoLidas}
        </span>
      )}
    </Link>
  );
}
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const statusColors = {
  Pendente: 'bg-amber-50 text-amber-600 border-amber-100',
  Confirmado: 'bg-blue-50 text-[#2E75B6] border-blue-100',
  Concluido: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Cancelado: 'bg-red-50 text-red-500 border-red-100',
};

export default function RecentAppointments({ agendamentos }) {
  if (!agendamentos?.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-lg font-heading font-semibold text-slate-800 mb-4">
          Próximos Agendamentos
        </h3>
        <p className="text-slate-400 text-sm text-center py-8">
          Nenhum agendamento encontrado
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h3 className="text-lg font-heading font-semibold text-slate-800 mb-4">
        Próximos Agendamentos
      </h3>
      <div className="space-y-2.5">
        {agendamentos.slice(0, 5).map((a, idx) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-4 p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[#DCEAF6] flex items-center justify-center shrink-0">
              <CalendarDays className="w-[18px] h-[18px] text-[#2E75B6]" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {a.nome_pet || 'Pet'} — {a.servico}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-400">
                  {a.data_hora ? format(new Date(a.data_hora), "dd MMM, HH:mm", { locale: ptBR }) : '—'}
                </span>
              </div>
            </div>
            <Badge className={`text-xs ${statusColors[a.status] || ''} border`}>
              {a.status}
            </Badge>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
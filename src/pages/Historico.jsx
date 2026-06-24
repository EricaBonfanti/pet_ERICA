import React from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';
import moment from 'moment';

const servicoIcons = { Banho: '🛁', Tosa: '✂️', 'Hidratação': '💧', 'Corte de unha': '✂️', 'Limpeza de ouvido': '👂' };
const statusColors = { Pendente: 'bg-amber-100 text-amber-700', Confirmado: 'bg-blue-100 text-blue-700', Concluido: 'bg-emerald-100 text-emerald-700', Cancelado: 'bg-red-100 text-red-700' };

export default function Historico() {
  const { user } = useAuth();

  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ['historico-servicos', user?.id],
    queryFn: () => base44.entities.Agendamento.filter({ id_cliente: user?.id }, '-data_hora', 100),
  });

  if (isLoading) return <Spinner label="Carregando histórico..." />;

  const lista = agendamentos || [];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-heading font-bold text-foreground">Histórico de Serviços</h1><p className="text-muted-foreground text-sm mt-1">Todos os serviços realizados nos seus pets</p></div>
      <div className="space-y-3">
        {lista.map((a, idx) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <span className="text-2xl">{servicoIcons[a.servico] || '📋'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{a.servico}</span>
                <Badge className={statusColors[a.status]}>{a.status}</Badge>
                {a.tipo_cobranca === 'coberto_pelo_plano' && <Badge className="bg-emerald-100 text-emerald-700 text-xs">🛡️ Plano</Badge>}
                {a.tipo_cobranca === 'avulso' && a.valor > 0 && <Badge className="bg-slate-100 text-slate-600 text-xs">💰 Avulso</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">🐾 {a.nome_pet} • {moment(a.data_hora).format('DD/MM/YYYY HH:mm')}</p>
              {a.valor != null && a.valor > 0 && <p className="text-sm font-medium text-primary">R$ {Number(a.valor).toFixed(2)}</p>}
              {a.tipo_cobranca === 'coberto_pelo_plano' && <p className="text-sm font-medium text-emerald-600">R$ 0,00 (coberto)</p>}
            </div>
          </motion.div>
        ))}
        {lista.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum serviço no histórico</p>}
      </div>
    </div>
  );
}
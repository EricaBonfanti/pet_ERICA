import React from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';
import moment from 'moment';

const tipoIcons = { VacinaVencida: '🔴', VacinaAVencer: '🟡', Pagamento: '💳', Agendamento: '📅', Geral: '📢' };

export default function Notificacoes() {
  const { user } = useAuth();
  const idPetShop = user?.id_pet_shop;
  const queryClient = useQueryClient();

  const { data: notificacoes, isLoading } = useQuery({
    queryKey: ['notificacoes-page', user?.id],
    queryFn: () => base44.entities.Notificacao.filter({ id_usuario: user?.id }, '-created_date', 50),
    enabled: !!user?.id,
  });

  const marcarLida = useMutation({
    mutationFn: (id) => base44.entities.Notificacao.update(id, { lida: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes-page'] }),
  });

  const marcarTodas = useMutation({
    mutationFn: async () => {
      const naoLidas = (notificacoes || []).filter((n) => !n.lida);
      for (const n of naoLidas) { await base44.entities.Notificacao.update(n.id, { lida: true }); }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes-page'] }),
  });

  if (isLoading) return <Spinner label="Carregando notificações..." />;

  const lista = notificacoes || [];
  const temNaoLidas = lista.some((n) => !n.lida);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-heading font-bold text-foreground">Notificações</h1><p className="text-muted-foreground text-sm mt-1">Alertas e lembretes importantes</p></div>
        {temNaoLidas && <Button variant="outline" size="sm" onClick={() => marcarTodas.mutate()}><Check className="w-4 h-4 mr-1" /> Marcar todas como lidas</Button>}
      </div>
      <div className="space-y-2">
        {lista.map((n, idx) => (
          <motion.div key={n.id} initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
            className={`bg-card rounded-xl border p-4 flex items-start gap-3 cursor-pointer hover:shadow-sm transition-shadow ${!n.lida ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
            onClick={() => !n.lida && marcarLida.mutate(n.id)}>
            <span className="text-lg mt-0.5">{tipoIcons[n.tipo] || '📢'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium text-sm ${!n.lida ? 'text-foreground' : 'text-muted-foreground'}`}>{n.titulo}</span>
                {!n.lida && <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">Nova</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{n.mensagem}</p>
              <p className="text-xs text-muted-foreground mt-1">{moment(n.created_date).format('DD/MM/YYYY HH:mm')}</p>
            </div>
          </motion.div>
        ))}
        {lista.length === 0 && (
          <div className="text-center py-12"><Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">Nenhuma notificação</p></div>
        )}
      </div>
    </div>
  );
}
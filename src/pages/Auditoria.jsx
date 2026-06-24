import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';
import moment from 'moment';

const actionColors = {
  criar: 'bg-emerald-100 text-emerald-700',
  atualizar: 'bg-blue-100 text-blue-700',
  deletar: 'bg-red-100 text-red-700',
};

export default function Auditoria() {
  const { user } = useAuth();
  const idPetShop = user?.id_pet_shop;
  const [expanded, setExpanded] = useState({});

  const { data: logs, isLoading } = useQuery({
    queryKey: ['auditoria', idPetShop],
    queryFn: () => base44.entities.AuditLog.filter({ id_pet_shop: idPetShop }, '-created_date', 100),
  });

  if (isLoading) return <Spinner label="Carregando logs..." />;

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-heading font-bold text-foreground">Auditoria</h1><p className="text-muted-foreground text-sm mt-1">Registro de todas as alterações do sistema</p></div>

      <div className="space-y-3">
        {(logs || []).map((log, idx) => {
          let detalhes = null;
          try { detalhes = log.detalhes ? JSON.parse(log.detalhes) : null; } catch (e) { detalhes = log.detalhes; }
          return (
            <motion.div key={log.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Shield className="w-4.5 h-4.5 text-primary" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{log.entidade}</span>
                      <Badge className={actionColors[log.acao] || 'bg-gray-100'}>{log.acao}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.usuario_nome} • {moment(log.created_date).format('DD/MM/YYYY HH:mm')}</p>
                  </div>
                </div>
                {detalhes && (
                  <button onClick={() => toggleExpand(log.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                    {expanded[log.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {expanded[log.id] && detalhes && (
                <div className="mt-3 p-3 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap break-all">{JSON.stringify(detalhes, null, 2)}</div>
              )}
            </motion.div>
          );
        })}
        {(!logs || logs.length === 0) && (
          <div className="text-center py-16"><Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">Nenhum registro de auditoria</p></div>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { isStaff as checkStaff } from '@/lib/roleUtils';
import { logAudit } from '@/lib/auditLog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CalendarDays, Plus, Pencil, Trash2, Clock, User, AlertTriangle } from 'lucide-react';
import AgendamentoForm from '@/components/agendamentos/AgendamentoForm';
import Spinner from '@/components/ui/Spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { podeCancelar } from '@/lib/agendamentoUtils';

const statusColors = {
  Pendente: 'bg-amber-100 text-amber-700 border-amber-200',
  Confirmado: 'bg-blue-100 text-blue-700 border-blue-200',
  Concluido: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Cancelado: 'bg-red-100 text-red-700 border-red-200',
};

export default function Agendamentos() {
  const { user } = useAuth();
  const role = user?.role || 'cliente';
  const staff = checkStaff(role);
  const idPetShop = user?.id_pet_shop;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null); // agendamento a cancelar

  const { data: agendamentos, isLoading: loadingA } = useQuery({
    queryKey: ['agendamentos', idPetShop],
    queryFn: () =>
      staff
        ? base44.entities.Agendamento.filter({ id_pet_shop: idPetShop }, '-data_hora', 200)
        : base44.entities.Agendamento.filter({ id_cliente: user?.id }, '-data_hora', 50),
  });

  const { data: pets } = useQuery({
    queryKey: ['all-pets', idPetShop],
    queryFn: () =>
      staff
        ? base44.entities.Pet.filter({ id_pet_shop: idPetShop }, '-created_date', 200)
        : base44.entities.Pet.filter({ id_tutor: user?.id }, '-created_date', 50),
  });

  // Todos os pets do pet shop — necessário para calcular porte nos conflitos de horário
  const { data: todosPetsPetShop } = useQuery({
    queryKey: ['todos-pets-petshop', idPetShop],
    queryFn: () => base44.entities.Pet.filter({ id_pet_shop: idPetShop }, '', 500),
    enabled: !!idPetShop,
  });

  const { data: clientes } = useQuery({
    queryKey: ['all-clientes', idPetShop],
    queryFn: () => base44.entities.User.filter({ id_pet_shop: idPetShop }, '-created_date', 200),
    enabled: staff,
  });

  // Query separada: TODOS os agendamentos ativos do pet shop (para calcular conflitos na grade)
  // Sempre busca pelo pet shop, independente de ser staff ou cliente
  const { data: todosAgendamentosPetShop } = useQuery({
    queryKey: ['agendamentos-petshop', idPetShop],
    queryFn: () => base44.entities.Agendamento.filter({ id_pet_shop: idPetShop }, '-data_hora', 500),
    enabled: !!idPetShop,
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Agendamento.create({ ...data, id_pet_shop: idPetShop }),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-petshop'] });
      logAudit({ acao: 'criar', entidade: 'Agendamento', detalhes: data });
      toast.success('Agendamento criado!');
      setDialogOpen(false);
    },
    onError: (err) => {
      toast.error(err?.message || 'Erro ao criar agendamento');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agendamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-petshop'] });
      logAudit({ acao: 'atualizar', entidade: 'Agendamento', entidade_id: editing?.id });
      toast.success('Agendamento atualizado!');
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (err) => {
      toast.error(err?.message || 'Erro ao atualizar agendamento');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Agendamento.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-petshop'] });
      logAudit({ acao: 'deletar', entidade: 'Agendamento', entidade_id: id });
      toast.success('Agendamento removido');
    },
    onError: (err) => {
      toast.error(err?.message || 'Erro ao remover agendamento');
    },
  });

  const cancelMut = useMutation({
    // Usa campo "observacoes" que já existe na tabela, não campo novo
    mutationFn: ({ id, cobrar }) =>
      base44.entities.Agendamento.update(id, {
        status: 'Cancelado',
        observacoes: cobrar
          ? 'Cancelado com menos de 6h de antecedência — cobrança aplicada'
          : 'Cancelado pelo cliente/pet shop',
      }),
    onSuccess: (_, { cobrar }) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-petshop'] });
      if (cobrar) {
        toast.warning('Agendamento cancelado. Cobrança aplicada (menos de 6h de antecedência).');
      } else {
        toast.success('Agendamento cancelado.');
      }
      setCancelTarget(null);
    },
    onError: (err) => {
      toast.error(err?.message || 'Erro ao cancelar agendamento');
    },
  });

  const handleSubmit = (formData) => {
    if (editing) { updateMut.mutate({ id: editing.id, data: formData }); }
    else { createMut.mutate(formData); }
  };

  const handleCancelarClick = (ag) => {
    setCancelTarget(ag);
  };

  const confirmaCancelamento = () => {
    if (!cancelTarget) return;
    const { pode, deveCobranca } = podeCancelar(cancelTarget.data_hora);
    cancelMut.mutate({ id: cancelTarget.id, cobrar: !pode && deveCobranca });
  };

  const cancelInfo = cancelTarget ? podeCancelar(cancelTarget.data_hora) : null;
  const filtered = (agendamentos || []).filter((a) => statusFilter === 'all' || a.status === statusFilter);
  // Para conflito de horários: usa TODOS do pet shop (inclui agendamentos de outros clientes)
  const agendamentosAtivos = (todosAgendamentosPetShop || []).filter((a) => a.status !== 'Cancelado');

  if (loadingA) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} agendamento(s)</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Agendamento
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="bg-muted">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="Pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="Confirmado">Confirmados</TabsTrigger>
          <TabsTrigger value="Concluido">Concluídos</TabsTrigger>
          <TabsTrigger value="Cancelado">Cancelados</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((a, idx) => {
            const cancelStatus = a.status !== 'Cancelado' && a.status !== 'Concluido'
              ? podeCancelar(a.data_hora)
              : null;
            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.02 }}
                className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{a.servico}</h3>
                      <Badge className={`${statusColors[a.status] || ''} border text-xs`}>{a.status}</Badge>
                      {a.tipo_cobranca === 'coberto_pelo_plano' && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">🛡️ Plano</Badge>
                      )}
                      {a.tipo_cobranca === 'avulso' && a.valor > 0 && (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">💰 Avulso</Badge>
                      )}
                      {a.observacoes?.includes('cobrança') && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">⚠️ Cobrança aplicada</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {a.data_hora ? format(new Date(a.data_hora), "dd MMM yyyy, HH:mm", { locale: ptBR }) : '—'}
                      </span>
                      <span className="flex items-center gap-1">🐾 {a.nome_pet || 'Pet'}</span>
                      {staff && a.nome_cliente && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{a.nome_cliente}</span>
                      )}
                      {a.valor != null && a.valor > 0 && (
                        <span className="font-medium text-foreground">R$ {Number(a.valor).toFixed(2)}</span>
                      )}
                      {a.tipo_cobranca === 'coberto_pelo_plano' && (
                        <span className="font-medium text-emerald-600">R$ 0,00</span>
                      )}
                    </div>
                    {/* Aviso de cancelamento tardio */}
                    {cancelStatus && !cancelStatus.pode && cancelStatus.deveCobranca && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-orange-600">
                        <AlertTriangle className="w-3 h-3" />
                        Cancelamento agora gera cobrança (menos de 6h de antecedência)
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(a); setDialogOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                    {/* Botões rápidos de status — só para staff */}
                    {staff && a.status === 'Pendente' && (
                      <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => updateMut.mutate({ id: a.id, data: { status: 'Confirmado' } })}>
                        ✓ Confirmar
                      </Button>
                    )}
                    {staff && (a.status === 'Pendente' || a.status === 'Confirmado') && (
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => updateMut.mutate({ id: a.id, data: { status: 'Concluido' } })}>
                        ✓ Concluir
                      </Button>
                    )}
                    {a.status !== 'Cancelado' && a.status !== 'Concluido' && (
                      <Button size="sm" variant="ghost" className="text-orange-600 hover:text-orange-700"
                        onClick={() => handleCancelarClick(a)}>
                        Cancelar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Remover este agendamento permanentemente?')) deleteMut.mutate(a.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
        </div>
      )}

      {/* Dialog novo/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
          </DialogHeader>
          <AgendamentoForm
            agendamento={editing}
            pets={pets || []}
            clientes={clientes || []}
            agendamentosExistentes={agendamentosAtivos}
            allPets={todosPetsPetShop || pets || []}
            onSubmit={handleSubmit}
            onCancel={() => { setDialogOpen(false); setEditing(null); }}
            isStaff={staff}
            currentUser={user}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de cancelamento */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelInfo && !cancelInfo.pode && cancelInfo.deveCobranca ? (
                <span className="text-orange-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Atenção: faltam menos de 6 horas para o agendamento. O cancelamento agora implica <strong>cobrança do valor integral</strong>.
                </span>
              ) : (
                'Tem certeza que deseja cancelar este agendamento?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className={cancelInfo && !cancelInfo.pode && cancelInfo.deveCobranca
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-destructive hover:bg-destructive/90'}
              onClick={confirmaCancelamento}
            >
              {cancelInfo && !cancelInfo.pode && cancelInfo.deveCobranca
                ? 'Cancelar mesmo assim (cobrar)'
                : 'Confirmar cancelamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

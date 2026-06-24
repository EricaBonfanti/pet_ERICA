import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { isStaff } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle, PawPrint, Star, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';
import { PLANOS_FIXOS } from '@/lib/pricing';

const statusColors = {
  Ativo: 'bg-emerald-100 text-emerald-700',
  Inadimplente: 'bg-red-100 text-red-700',
  Inativo: 'bg-gray-100 text-gray-600',
  Cancelado: 'bg-orange-100 text-orange-700',
};

const planIcons = { Básico: Star, Premium: Crown, 'Premium Plus': Crown };

export default function Planos() {
  const { user } = useAuth();
  const idPetShop = user?.id_pet_shop;
  const queryClient = useQueryClient();
  const staff = isStaff(user?.role);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [petSelecionado, setPetSelecionado] = useState('');

  const { data: planos, isLoading } = useQuery({
    queryKey: ['planos', idPetShop],
    queryFn: () =>
      staff
        ? base44.entities.PlanoMensal.filter({ id_pet_shop: idPetShop }, '-created_date', 100)
        : base44.entities.PlanoMensal.filter({ id_tutor: user?.id }, '-created_date', 50),
  });

  const { data: allPets } = useQuery({
    queryKey: ['pets-planos', idPetShop],
    queryFn: () =>
      staff ? base44.entities.Pet.filter({ id_pet_shop: idPetShop }, '-created_date', 200)
        : base44.entities.Pet.filter({ id_tutor: user?.id }, '-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanoMensal.create({ ...data, id_pet_shop: idPetShop }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      setDialogOpen(false);
      setPetSelecionado('');
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanoMensal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planos'] }),
  });

  const cancelarPlano = useMutation({
    mutationFn: (id) => base44.entities.PlanoMensal.update(id, { status: 'Cancelado' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planos'] }),
  });

  // Pets que já têm plano ativo
  const petsComPlano = new Set(
    (planos || []).filter((p) => p.status === 'Ativo').map((p) => p.id_pet)
  );

  const handleAssinar = () => {
    if (!selectedPlan || !petSelecionado) return;
    const pet = allPets?.find((p) => p.id === petSelecionado);
    createMutation.mutate({
      nome: selectedPlan.nome,
      descricao: selectedPlan.descricao,
      valor_mensal: selectedPlan.valor,
      id_pet: petSelecionado,
      nome_pet: pet?.nome_pet || '',
      id_tutor: pet?.id_tutor || user?.id,
      nome_tutor: user?.full_name || '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_vencimento: new Date().toISOString().split('T')[0],
      status: 'Ativo',
    });
  };

  const openAssinar = (plano) => {
    setSelectedPlan(plano);
    setPetSelecionado('');
    setDialogOpen(true);
  };

  if (isLoading) return <Spinner label="Carregando planos..." />;

  return (
    <div className="space-y-8">
      {/* Tabela de Planos Fixos */}
      <div>
        <div className="mb-4">
          <h1 className="text-2xl font-heading font-bold text-foreground">Planos Mensais</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tabela de preços fixa — válida para toda a plataforma Petlify
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLANOS_FIXOS.map((plano, idx) => {
            const Icon = planIcons[plano.nome] || Star;
            return (
              <motion.div
                key={plano.nome}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`${plano.cor} border-2 rounded-2xl p-6 flex flex-col`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <Icon className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-foreground">{plano.nome}</h3>
                  </div>
                </div>

                <div className="mb-3">
                  <span className="text-3xl font-bold text-foreground">R$ {plano.valor}</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{plano.descricao}</p>

                <ul className="space-y-1.5 mb-6 flex-1">
                  {plano.beneficios.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> {b}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  onClick={() => openAssinar(plano)}
                  disabled={allPets?.length === 0}
                >
                  Assinar
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Assinaturas Ativas */}
      <div>
        <h2 className="text-lg font-heading font-semibold text-foreground mb-3">
          {staff ? 'Assinaturas do Pet Shop' : 'Minhas Assinaturas'}
        </h2>

        {(!planos || planos.length === 0) ? (
          <p className="text-center text-muted-foreground py-6 bg-card rounded-xl border border-border">
            Nenhuma assinatura ativa
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(planos || []).map((plano, idx) => {
              const info = PLANOS_FIXOS.find((p) => p.nome === plano.nome);
              return (
                <motion.div
                  key={plano.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-card rounded-2xl border border-border p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{plano.nome}</h3>
                      <Badge className={`mt-1.5 ${statusColors[plano.status]}`}>{plano.status}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">R$ {plano.valor_mensal?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">/mês</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <PawPrint className="w-3.5 h-3.5" />
                    <span>{plano.nome_pet}</span>
                  </div>
                  {staff && plano.status === 'Inadimplente' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => updateStatus.mutate({ id: plano.id, data: { status: 'Ativo' } })}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirmar Pagamento
                    </Button>
                  )}
                  {(plano.status === 'Ativo' || plano.status === 'Inadimplente') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full mt-1 text-muted-foreground hover:text-destructive"
                      onClick={() => cancelarPlano.mutate(plano.id)}
                    >
                      Cancelar assinatura
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog: selecionar pet para assinar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle className="font-heading">
            Assinar Plano {selectedPlan?.nome}
          </DialogTitle>
          <div className="space-y-4 mt-2">
            {selectedPlan && (
              <div className="p-3 rounded-xl bg-muted">
                <p className="font-semibold text-foreground">R$ {selectedPlan.valor}/mês</p>
                <p className="text-sm text-muted-foreground">{selectedPlan.descricao}</p>
              </div>
            )}
            <div>
              <Label>Selecione o Pet</Label>
              <Select value={petSelecionado} onValueChange={setPetSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o pet..." />
                </SelectTrigger>
                <SelectContent>
                  {(allPets || []).map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={petsComPlano.has(p.id)}>
                      {p.nome_pet} {petsComPlano.has(p.id) ? '(já possui plano)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {allPets?.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Cadastre um pet primeiro</p>
              )}
            </div>
            <Button
              className="w-full"
              disabled={!petSelecionado || createMutation.isPending}
              onClick={handleAssinar}
            >
              {createMutation.isPending ? 'Assinando...' : 'Confirmar Assinatura'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
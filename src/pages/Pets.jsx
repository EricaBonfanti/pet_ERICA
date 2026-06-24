import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { isStaff as checkStaff } from '@/lib/roleUtils';
import { logAudit } from '@/lib/auditLog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PawPrint, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import PetForm from '@/components/pets/PetForm';
import Spinner from '@/components/ui/Spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const porteColors = {
  Pequeno: 'bg-emerald-100 text-emerald-700',
  Medio: 'bg-blue-100 text-blue-700',
  Grande: 'bg-purple-100 text-purple-700',
};

export default function Pets() {
  const { user } = useAuth();
  const role = user?.role || 'cliente';
  const staff = checkStaff(role);
  const idPetShop = user?.id_pet_shop;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [search, setSearch] = useState('');

  const { data: pets, isLoading } = useQuery({
    queryKey: ['pets', idPetShop],
    queryFn: () =>
      staff
        ? base44.entities.Pet.filter({ id_pet_shop: idPetShop }, '-created_date', 100)
        : base44.entities.Pet.filter({ id_tutor: user?.id }, '-created_date', 50),
  });

  const { data: tutores } = useQuery({
    queryKey: ['tutores', idPetShop],
    queryFn: () => base44.entities.User.filter({ id_pet_shop: idPetShop }, '-created_date', 200),
    enabled: staff,
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Pet.create({ ...data, id_pet_shop: idPetShop }),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      logAudit({ acao: 'criar', entidade: 'Pet', detalhes: data });
      toast.success('Pet cadastrado com sucesso!');
      setDialogOpen(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pet.update(id, data),
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      logAudit({ acao: 'atualizar', entidade: 'Pet', entidade_id: editingPet?.id, detalhes: data });
      toast.success('Pet atualizado!');
      setDialogOpen(false);
      setEditingPet(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Pet.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      logAudit({ acao: 'deletar', entidade: 'Pet', entidade_id: id });
      toast.success('Pet removido');
    },
  });

  const handleSubmit = (formData) => {
    if (editingPet) {
      updateMut.mutate({ id: editingPet.id, data: formData });
    } else {
      createMut.mutate(formData);
    }
  };

  const filteredPets = (pets || []).filter((p) =>
    p.nome_pet?.toLowerCase().includes(search.toLowerCase()) ||
    p.raca?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{staff ? 'Pets' : 'Meus Pets'}</h1>
          <p className="text-sm text-muted-foreground">{filteredPets.length} pet(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => { setEditingPet(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Pet
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou raça..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredPets.map((p, idx) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.03 }}
              className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <PawPrint className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{p.nome_pet}</h3>
                    <p className="text-xs text-muted-foreground">{p.raca}</p>
                  </div>
                </div>
                <Badge className={porteColors[p.porte]}>{p.porte}</Badge>
              </div>
              {p.idade != null && <p className="text-xs text-muted-foreground mt-3">{p.idade} {p.idade === 1 ? 'ano' : 'anos'}</p>}
              {p.observacoes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.observacoes}</p>}
              <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => { setEditingPet(p); setDialogOpen(true); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { if (confirm('Remover este pet?')) deleteMut.mutate(p.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredPets.length === 0 && (
        <div className="text-center py-16">
          <PawPrint className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum pet encontrado</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">{editingPet ? 'Editar Pet' : 'Cadastrar Novo Pet'}</DialogTitle></DialogHeader>
          <PetForm pet={editingPet} tutores={tutores} onSubmit={handleSubmit} onCancel={() => { setDialogOpen(false); setEditingPet(null); }} currentUserId={user?.id} isStaff={staff} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
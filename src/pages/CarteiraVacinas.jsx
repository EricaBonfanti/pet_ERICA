import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { isStaff } from '@/lib/roleUtils';
import { getVacinasParaEspecie, OUTRA_VACINA } from '@/lib/vacinasPadrao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Syringe, ArrowLeft, PawPrint, Cat, Dog } from 'lucide-react';
import { motion } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';
import moment from 'moment';

const especieIcon = (especie) => {
  if (especie === 'Gato') return <Cat className="w-5 h-5" />;
  if (especie === 'Cão') return <Dog className="w-5 h-5" />;
  return <PawPrint className="w-5 h-5" />;
};

export default function CarteiraVacinas() {
  const { user } = useAuth();
  const idPetShop = user?.id_pet_shop;
  const queryClient = useQueryClient();
  const staff = isStaff(user?.role);

  // Etapas do fluxo do Funcionário: 'busca' -> 'lista_pets' -> 'carteirinha'
  // Cliente vai direto para 'lista_pets' (com seus próprios pets).
  const [step, setStep] = useState(staff ? 'busca' : 'lista_pets');
  const [buscaCpf, setBuscaCpf] = useState('');
  const [cpfBuscado, setCpfBuscado] = useState('');
  const [selectedPet, setSelectedPet] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome_vacina: '', vacina_custom: '', data_aplicacao: '', data_validade: '', lote: '', veterinario: '', observacoes: '' });

  // Busca os pets vinculados ao CPF/nome informado (Funcionário) ou os próprios pets (Cliente)
  const { data: pets, isLoading: loadingPets } = useQuery({
    queryKey: ['pets-vac', idPetShop, staff ? cpfBuscado : user?.id],
    queryFn: async () => {
      if (staff) {
        if (!cpfBuscado) return [];
        // Tenta por CPF exato primeiro; se não achar, busca por nome (ilike)
        const ehCpf = /^\d{7,}$/.test(cpfBuscado.replace(/\D/g, ''));
        let tutores = [];
        if (ehCpf) {
          const cpfLimpo = cpfBuscado.replace(/\D/g, '');
          tutores = await base44.entities.User.filter({ cpf: cpfLimpo, id_pet_shop: idPetShop }, '', 5);
          // Tenta também com máscara formatada caso esteja salvo assim
          if (tutores.length === 0) {
            tutores = await base44.entities.User.search('cpf', cpfLimpo, { id_pet_shop: idPetShop }, '', 5);
          }
        } else {
          tutores = await base44.entities.User.search('full_name', cpfBuscado, { id_pet_shop: idPetShop }, '', 10);
        }
        if (tutores.length === 0) return [];
        const tutor = tutores[0];
        const petsDoTutor = await base44.entities.Pet.filter({ id_tutor: tutor.id, id_pet_shop: idPetShop }, '-created_date', 50);
        return petsDoTutor.map((p) => ({ ...p, _tutor: tutor }));
      }
      return base44.entities.Pet.filter({ id_tutor: user?.id, id_pet_shop: idPetShop }, '-created_date', 50);
    },
    enabled: staff ? step !== 'busca' : true,
  });

  // Vacinas do pet selecionado (carteirinha individual)
  const { data: vacinas, isLoading: loadingVacinas } = useQuery({
    queryKey: ['vacinas-pet', selectedPet?.id],
    queryFn: () => base44.entities.Vacina.filter({ id_pet: selectedPet.id }, '-data_aplicacao', 100),
    enabled: !!selectedPet,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vacina.create({ ...data, id_pet_shop: idPetShop }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacinas-pet', selectedPet?.id] });
      setShowForm(false);
      setForm({ nome_vacina: '', vacina_custom: '', data_aplicacao: '', data_validade: '', lote: '', veterinario: '', observacoes: '' });
    },
  });

  const handleBuscar = (e) => {
    e.preventDefault();
    // Se parece CPF (tem dígitos), limpa formatação; senão mantém o texto para busca por nome
    const temDigitos = /\d{7,}/.test(buscaCpf.replace(/\D/g, ''));
    setCpfBuscado(temDigitos ? buscaCpf : buscaCpf.trim());
    setStep('lista_pets');
  };

  const handleSelecionarPet = (pet) => {
    setSelectedPet(pet);
    setStep('carteirinha');
  };

  const handleVoltar = () => {
    if (step === 'carteirinha') {
      setSelectedPet(null);
      setStep('lista_pets');
    } else if (step === 'lista_pets' && staff) {
      setCpfBuscado('');
      setBuscaCpf('');
      setStep('busca');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const tutor = selectedPet?._tutor || user;
    const nomeVacinaFinal = form.nome_vacina === OUTRA_VACINA ? form.vacina_custom : form.nome_vacina;
    createMutation.mutate({
      nome_vacina: nomeVacinaFinal,
      id_pet: selectedPet.id,
      nome_pet: selectedPet.nome_pet,
      id_tutor: tutor?.id || selectedPet.id_tutor,
      nome_tutor: tutor?.full_name || '',
      cpf_tutor: tutor?.cpf || '',
      data_aplicacao: form.data_aplicacao,
      data_validade: form.data_validade,
      lote: form.lote,
      veterinario: form.veterinario,
      observacoes: form.observacoes,
      confirmado: true,
    });
  };

  const hoje = new Date();
  const isVencida = (data) => data && new Date(data) < hoje;
  const opcoesVacina = selectedPet ? getVacinasParaEspecie(selectedPet.especie) : [];

  // === ETAPA 1 (somente Funcionário): busca por CPF ===
  if (step === 'busca') {
    return (
      <div className="space-y-6 max-w-md">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Carteira de Vacinação</h1>
          <p className="text-muted-foreground text-sm mt-1">Busque o tutor pelo CPF ou nome para acessar os pets vinculados</p>
        </div>
        <form onSubmit={handleBuscar} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por CPF ou nome do tutor..."
              value={buscaCpf}
              onChange={(e) => setBuscaCpf(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </div>
    );
  }

  // === ETAPA 2: lista de pets vinculados (ao CPF buscado, ou do próprio Cliente) ===
  if (step === 'lista_pets') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {staff && (
            <Button variant="ghost" size="icon" onClick={handleVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              {staff ? 'Selecione o Pet' : 'Carteira de Vacinação'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {staff ? 'Pets vinculados a este tutor' : 'Selecione um pet para ver a carteirinha'}
            </p>
          </div>
        </div>

        {loadingPets ? (
          <Spinner label="Buscando pets..." />
        ) : (pets || []).length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {staff ? 'Nenhum tutor ou pet encontrado para este CPF' : 'Você ainda não tem pets cadastrados'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pets.map((pet, idx) => (
              <motion.button
                key={pet.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => handleSelecionarPet(pet)}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
              >
                <Avatar className="h-11 w-11 bg-primary/10 text-primary">
                  <AvatarFallback className="bg-primary/10 text-primary">{especieIcon(pet.especie)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{pet.nome_pet}</p>
                  <p className="text-xs text-muted-foreground">{pet.especie || 'Pet'} • {pet.raca}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // === ETAPA 3: carteirinha individual do pet selecionado ===
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="h-11 w-11 bg-primary/10 text-primary">
            <AvatarFallback className="bg-primary/10 text-primary">{especieIcon(selectedPet?.especie)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">{selectedPet?.nome_pet}</h1>
            <p className="text-muted-foreground text-sm">{selectedPet?.especie} • {selectedPet?.raca}</p>
          </div>
        </div>
        {staff && <Button onClick={() => setShowForm(true)} size="sm"><Plus className="w-4 h-4 mr-1" /> Registrar Vacina</Button>}
      </div>

      {loadingVacinas ? (
        <Spinner label="Carregando carteirinha..." />
      ) : (
        <div className="space-y-3">
          {(vacinas || []).map((v, idx) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              className={`bg-card rounded-xl border p-4 flex flex-wrap items-center gap-3 ${isVencida(v.data_validade) ? 'border-red-200 bg-red-50/30' : 'border-border'}`}>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Syringe className="w-4.5 h-4.5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{v.nome_vacina}</span>
                  {isVencida(v.data_validade) && <Badge className="bg-red-100 text-red-700">Vencida</Badge>}
                  {v.data_validade && !isVencida(v.data_validade) && <Badge className="bg-emerald-100 text-emerald-700">Válida</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">Aplicada: {moment(v.data_aplicacao).format('DD/MM/YYYY')}{v.data_validade && ` • Validade: ${moment(v.data_validade).format('DD/MM/YYYY')}`}</p>
                {v.veterinario && <p className="text-xs text-muted-foreground">Veterinário: {v.veterinario} • Lote: {v.lote || '-'}</p>}
              </div>
            </motion.div>
          ))}
          {(!vacinas || vacinas.length === 0) && <p className="text-center text-muted-foreground py-8">Nenhuma vacina registrada para este pet</p>}
        </div>
      )}

      {staff && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogTitle>Registrar Vacina — {selectedPet?.nome_pet}</DialogTitle>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <Label>Vacina</Label>
                <Select value={form.nome_vacina} onValueChange={(v) => setForm({ ...form, nome_vacina: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a vacina" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesVacina.map((nome) => (
                      <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.nome_vacina === OUTRA_VACINA && (
                <div>
                  <Label>Nome da vacina (especificar)</Label>
                  <Input value={form.vacina_custom} onChange={(e) => setForm({ ...form, vacina_custom: e.target.value })} placeholder="Ex: Vacina específica" required />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Data Aplicação</Label><Input type="date" value={form.data_aplicacao} onChange={(e) => setForm({ ...form, data_aplicacao: e.target.value })} required /></div>
                <div><Label>Data Validade</Label><Input type="date" value={form.data_validade} onChange={(e) => setForm({ ...form, data_validade: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Lote</Label><Input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} /></div>
                <div><Label>Veterinário</Label><Input value={form.veterinario} onChange={(e) => setForm({ ...form, veterinario: e.target.value })} /></div>
              </div>
              <div><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || !form.nome_vacina}>{createMutation.isPending ? 'Salvando...' : 'Registrar Vacina'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

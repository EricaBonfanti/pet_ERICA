import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { isStaff } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Lock, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';
import moment from 'moment';

const formaColors = { PIX: 'bg-cyan-100 text-cyan-700', Cartao: 'bg-purple-100 text-purple-700', Dinheiro: 'bg-amber-100 text-amber-700' };
const tipoColors = { Mensalidade: 'bg-emerald-100 text-emerald-700', ServicoAvulso: 'bg-blue-100 text-blue-700', Estorno: 'bg-red-100 text-red-700', Ajuste: 'bg-gray-100 text-gray-600' };

export default function Pagamentos() {
  const { user } = useAuth();
  const idPetShop = user?.id_pet_shop;
  const queryClient = useQueryClient();
  const staff = isStaff(user?.role);
  const [showForm, setShowForm] = useState(false);
  const [senhaDinheiro, setSenhaDinheiro] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [form, setForm] = useState({ valor: '', forma_pagamento: '', tipo: 'Mensalidade', id_pet: '', observacoes: '' });
  const [busca, setBusca] = useState('');

  const { data: pagamentos, isLoading } = useQuery({
    queryKey: ['pagamentos', idPetShop],
    queryFn: () =>
      staff
        ? base44.entities.Pagamento.filter({ id_pet_shop: idPetShop }, '-created_date', 100)
        : base44.entities.Pagamento.filter({ id_cliente: user?.id }, '-created_date', 50),
  });

  const { data: pets } = useQuery({
    queryKey: ['pets-pag', idPetShop],
    queryFn: () => (staff ? base44.entities.Pet.filter({ id_pet_shop: idPetShop }, '-created_date', 100) : Promise.resolve([])),
    enabled: staff,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pagamento.create({ ...data, id_pet_shop: idPetShop }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      setShowForm(false); setShowSenha(false); setSenhaDinheiro('');
      setForm({ valor: '', forma_pagamento: '', tipo: 'Mensalidade', id_pet: '', observacoes: '' });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.forma_pagamento === 'Dinheiro' && !showSenha) { setShowSenha(true); return; }
    const pet = pets?.find((p) => p.id === form.id_pet);
    createMutation.mutate({
      valor: parseFloat(form.valor),
      forma_pagamento: form.forma_pagamento,
      tipo: form.tipo,
      id_cliente: pet?.id_tutor || user?.id,
      nome_cliente: user?.full_name || '',
      id_pet: form.id_pet || null,
      nome_pet: pet?.nome_pet || '',
      id_funcionario: staff ? user?.id : null,
      nome_funcionario: staff ? user?.full_name : null,
      observacoes: form.observacoes,
      confirmado: true,
    });
  };

  const lista = (pagamentos || []).filter((p) =>
    !busca || p.nome_cliente?.toLowerCase().includes(busca.toLowerCase()) || p.nome_pet?.toLowerCase().includes(busca.toLowerCase())
  );

  if (isLoading) return <Spinner label="Carregando..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-heading font-bold text-foreground">Pagamentos</h1><p className="text-muted-foreground text-sm mt-1">Histórico de transações</p></div>
        {staff && <Button onClick={() => setShowForm(true)} size="sm"><Plus className="w-4 h-4 mr-1" /> Registrar Pagamento</Button>}
      </div>
      {staff && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou pet..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
        </div>
      )}
      <div className="space-y-3">
        {lista.map((p, idx) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">R$ {p.valor?.toFixed(2)}</span>
                <Badge className={formaColors[p.forma_pagamento]}>{p.forma_pagamento}</Badge>
                <Badge className={tipoColors[p.tipo]}>{p.tipo}</Badge>
              </div>
              {p.nome_pet && <p className="text-sm text-muted-foreground mt-1">🐾 {p.nome_pet} • {p.nome_cliente}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">{moment(p.created_date).format('DD/MM/YYYY HH:mm')}{p.nome_funcionario && ` • Registrado por ${p.nome_funcionario}`}</p>
            </div>
          </motion.div>
        ))}
        {lista.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum pagamento encontrado</p>}
      </div>

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); setShowSenha(false); }}>
        <DialogContent>
          <DialogTitle>{showSenha ? 'Confirmar com Senha' : 'Registrar Pagamento'}</DialogTitle>
          {showSenha ? (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">Pagamento em dinheiro exige senha do funcionário</p>
              <Label>Senha</Label>
              <div className="flex gap-2">
                <Input type="password" placeholder="Digite sua senha" value={senhaDinheiro} onChange={(e) => setSenhaDinheiro(e.target.value)} />
                <Button variant="outline" size="icon" onClick={() => setShowSenha(false)}><X className="w-4 h-4" /></Button>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={!senhaDinheiro}><Lock className="w-3.5 h-3.5 mr-1" /> Confirmar Pagamento</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required /></div>
              <div><Label>Forma de Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="PIX">PIX</SelectItem><SelectItem value="Cartao">Cartão</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Mensalidade">Mensalidade</SelectItem><SelectItem value="ServicoAvulso">Serviço Avulso</SelectItem><SelectItem value="Estorno">Estorno</SelectItem><SelectItem value="Ajuste">Ajuste</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Pet (opcional)</Label>
                <Select value={form.id_pet} onValueChange={(v) => setForm({ ...form, id_pet: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>{(pets || []).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome_pet}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? 'Salvando...' : 'Registrar'}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
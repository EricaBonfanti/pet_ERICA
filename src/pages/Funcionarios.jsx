import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { UserPlus, Shield, Trash2, Mail, User, Lock, IdCard, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';

const emptyForm = { fullName: '', email: '', cpf: '', telefone: '', password: '' };

export default function Funcionarios() {
  const { user } = useAuth();
  const idPetShop = user?.id_pet_shop;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: funcionarios, isLoading } = useQuery({
    queryKey: ['funcionarios', idPetShop],
    queryFn: () => base44.entities.User.filter({ role: 'funcionario', id_pet_shop: idPetShop }, '-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.users.createEmployee(data),
    onSuccess: () => {
      setShowForm(false);
      setForm(emptyForm);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
    },
    onError: (err) => setError(err.message || 'Erro ao cadastrar funcionário'),
  });

  const removerMutation = useMutation({
    mutationFn: (id) => base44.entities.User.update(id, { role: 'cliente' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['funcionarios'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError('A senha deve ter no mínimo 8 caracteres, com 1 letra maiúscula e 1 número.');
      return;
    }
    createMutation.mutate(form);
  };

  if (isLoading) return <Spinner label="Carregando..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Funcionários</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie a equipe do pet shop</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm"><UserPlus className="w-4 h-4 mr-1" /> Cadastrar Funcionário</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(funcionarios || []).map((f, idx) => (
          <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Shield className="w-5 h-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{f.full_name || 'Sem nome'}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-100 text-blue-700">Funcionário</Badge>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removerMutation.mutate(f.id)}>
                  <Trash2 className="w-3.5 h-3.5" /> Remover
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
        {(!funcionarios || funcionarios.length === 0) && (
          <p className="col-span-full text-center text-muted-foreground py-8">Nenhum funcionário cadastrado</p>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogTitle>Cadastrar Funcionário</DialogTitle>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}
            <div>
              <Label>Nome completo</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-10" placeholder="Nome do funcionário" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label>E-mail</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" className="pl-10" placeholder="funcionario@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CPF</Label>
                <div className="relative mt-1">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Telefone</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="(00) 00000-0000" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                </div>
              </div>
            </div>
            <div>
              <Label>Senha de acesso</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" className="pl-10" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mín. 8 caracteres, 1 maiúscula e 1 número. Informe esta senha ao funcionário para o primeiro acesso.</p>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Cadastrando...' : 'Cadastrar Funcionário'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

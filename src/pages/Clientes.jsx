import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { isStaff as checkStaff, ROLE_LABELS } from '@/lib/roleUtils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Search, Mail, Phone } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';

export default function Clientes() {
  const { user } = useAuth();
  const role = user?.role || 'cliente';
  const staff = checkStaff(role);
  const idPetShop = user?.id_pet_shop;
  const [search, setSearch] = useState('');

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes-list', idPetShop],
    queryFn: () => base44.entities.User.filter({ id_pet_shop: idPetShop }, '-created_date', 200),
    enabled: staff,
  });

  const { data: pets } = useQuery({
    queryKey: ['pets-for-clientes', idPetShop],
    queryFn: () => base44.entities.Pet.filter({ id_pet_shop: idPetShop }, '-created_date', 500),
    enabled: staff,
  });

  if (!staff) return <Navigate to="/" replace />;
  if (isLoading) return <Spinner />;

  const clientList = (clientes || []).filter((c) =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getPetCount = (userId) => (pets || []).filter((p) => p.id_tutor === userId).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground">{clientList.length} usuário(s)</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientList.map((c, idx) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
            className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{c.full_name?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{c.full_name || 'Sem nome'}</h3>
                <div className="flex items-center gap-1.5 mt-0.5"><Mail className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-muted-foreground truncate">{c.email}</span></div>
                {c.telefone && <div className="flex items-center gap-1.5 mt-0.5"><Phone className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{c.telefone}</span></div>}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <Badge variant="secondary" className="text-xs">{ROLE_LABELS[c.role] || 'Cliente'}</Badge>
              <Badge variant="outline" className="text-xs">{getPetCount(c.id)} pet(s)</Badge>
            </div>
          </motion.div>
        ))}
      </div>
      {clientList.length === 0 && (
        <div className="text-center py-16"><Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">Nenhum cliente encontrado</p></div>
      )}
    </div>
  );
}
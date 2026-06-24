import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { CalendarDays, PawPrint, Users, CheckCircle } from 'lucide-react';
import { isStaff, ROLE_LABELS } from '@/lib/roleUtils';
import StatsCard from '@/components/dashboard/StatsCard';
import RecentAppointments from '@/components/dashboard/RecentAppointments';
import Spinner from '@/components/ui/Spinner';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || 'cliente';
  const staff = isStaff(role);
  const idPetShop = user?.id_pet_shop;

  const { data: agendamentos, isLoading: loadingA } = useQuery({
    queryKey: ['agendamentos-dash', idPetShop],
    queryFn: () =>
      staff
        ? base44.entities.Agendamento.filter({ id_pet_shop: idPetShop }, '-data_hora', 20)
        : base44.entities.Agendamento.filter({ id_cliente: user?.id }, '-data_hora', 10),
  });

  const { data: pets, isLoading: loadingP } = useQuery({
    queryKey: ['pets-dash', idPetShop],
    queryFn: () =>
      staff
        ? base44.entities.Pet.filter({ id_pet_shop: idPetShop }, '-created_date', 50)
        : base44.entities.Pet.filter({ id_tutor: user?.id }, '-created_date', 10),
  });

  const { data: clientes, isLoading: loadingC } = useQuery({
    queryKey: ['clientes-dash', idPetShop],
    queryFn: () => (staff ? base44.entities.User.filter({ id_pet_shop: idPetShop }, '-created_date', 100) : Promise.resolve([])),
    enabled: staff,
  });

  const { data: planos, isLoading: loadingPl } = useQuery({
    queryKey: ['planos-dash', idPetShop],
    queryFn: () => ((role === 'dono' || role === 'admin') ? base44.entities.PlanoMensal.filter({ id_pet_shop: idPetShop }, '-created_date', 200) : Promise.resolve([])),
    enabled: role === 'dono' || role === 'admin',
  });

  const isDono = role === 'dono' || role === 'admin';
  const isLoading = loadingA || loadingP || (staff && loadingC) || (isDono && loadingPl);

  if (isLoading) return <Spinner label="Carregando dashboard..." />;

  const agList = agendamentos || [];
  const petList = pets || [];
  const clienteList = clientes || [];

  const pendentes = agList.filter((a) => a.status === 'Pendente').length;
  const concluidos = agList.filter((a) => a.status === 'Concluido').length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
          Olá, {user?.full_name?.split(' ')[0] || 'Usuário'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {ROLE_LABELS[role]} — Resumo do seu painel
        </p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Agendamentos" value={agList.length} icon={CalendarDays} />
        <StatsCard title="Pendentes" value={pendentes} icon={CalendarDays} />
        <StatsCard title={staff ? 'Total Pets' : 'Meus Pets'} value={petList.length} icon={PawPrint} />
        {staff ? (
          <StatsCard title="Clientes" value={clienteList.filter((u) => u.role === 'cliente').length} icon={Users} />
        ) : (
          <StatsCard title="Concluídos" value={concluidos} icon={CheckCircle} />
        )}
      </div>

      {isDono && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-lg font-heading font-semibold text-slate-800 mb-4">Rentabilidade dos Planos</h3>
          {(!planos || planos.length === 0) ? (
            <p className="text-slate-400 text-sm text-center py-4">Nenhum plano cadastrado</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const agrupados = {};
                (planos || []).forEach((p) => {
                  const nome = p.nome || 'Sem nome';
                  if (!agrupados[nome]) agrupados[nome] = { total: 0, ativos: 0, qtd: 0 };
                  agrupados[nome].qtd += 1;
                  agrupados[nome].total += p.valor_mensal || 0;
                  if (p.status === 'Ativo') agrupados[nome].ativos += 1;
                });
                return Object.entries(agrupados).map(([nome, dados]) => (
                  <div key={nome} className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC]">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{nome}</p>
                      <p className="text-xs text-slate-400">{dados.qtd} plano(s) • {dados.ativos} ativo(s)</p>
                    </div>
                    <p className="text-lg font-bold text-[#2E75B6]">R$ {dados.total.toFixed(2)}</p>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <RecentAppointments agendamentos={agList} />
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-lg font-heading font-semibold text-slate-800 mb-4">
            {staff ? 'Pets Recentes' : 'Meus Pets'}
          </h3>
          {petList.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nenhum pet cadastrado</p>
          ) : (
            <div className="space-y-2.5">
              {petList.slice(0, 5).map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#F8FAFC]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#DCEAF6] flex items-center justify-center">
                    <PawPrint className="w-[18px] h-[18px] text-[#2E75B6]" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{p.nome_pet}</p>
                    <p className="text-xs text-slate-400">{p.raca} • {p.porte}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
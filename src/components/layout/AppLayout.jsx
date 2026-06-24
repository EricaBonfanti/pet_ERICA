import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import Sidebar from './Sidebar';
import NotificationBell from '@/components/ui/NotificationBell';

export default function AppLayout({ user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role || 'cliente';
  const idPetShop = user?.id_pet_shop;

  const { data: petShop } = useQuery({
    queryKey: ['pet-shop', idPetShop],
    queryFn: () => (idPetShop ? base44.entities.PetShop.get(idPetShop) : Promise.resolve(null)),
    enabled: !!idPetShop,
  });

  // Auto-vincular funcionario ao Pet Shop do Dono que o convidou
  useEffect(() => {
    if (!user?.id || user?.id_pet_shop) return;
    if (user?.role !== 'funcionario') return;

    (async () => {
      try {
        // created_by_id contém o ID do Dono que convidou
        const createdById = user?.created_by_id;
        if (!createdById) return;
        const dono = await base44.entities.User.get(createdById);
        if (dono?.id_pet_shop) {
          await base44.entities.User.update(user.id, { id_pet_shop: dono.id_pet_shop });
          window.location.reload();
        }
      } catch (e) {
        // silencioso
      }
    })();
  }, [user?.id, user?.id_pet_shop, user?.role]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EAF2FA] via-[#F3F7FB] to-[#EAF2FA]">
      <Sidebar user={user} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} petShop={petShop} />
      <div className="lg:pl-64">
        <div className="flex justify-end px-4 sm:px-6 lg:px-8 pt-4">
          <NotificationBell />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
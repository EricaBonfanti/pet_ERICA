import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { User, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EditarPerfil() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    cpf: user?.cpf || '',
    data_nascimento: user?.data_nascimento || '',
    telefone: user?.telefone || '',
    lgpd_consent: user?.lgpd_consent || false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.cpf) e.cpf = 'CPF é obrigatório';
    if (!form.data_nascimento) e.data_nascimento = 'Data de nascimento é obrigatória';
    if (!form.telefone) e.telefone = 'Telefone é obrigatório';
    if (!form.lgpd_consent) e.lgpd_consent = 'Aceite do termo LGPD é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await base44.auth.updateMe(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Editar Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Complete seus dados cadastrais</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome Completo</Label>
            <Input value={user?.full_name || ''} disabled className="bg-muted" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={user?.email || ''} disabled className="bg-muted" />
          </div>
          <div>
            <Label>CPF *</Label>
            <Input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              placeholder="000.000.000-00"
              className={errors.cpf ? 'border-red-500' : ''}
            />
            {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
          </div>
          <div>
            <Label>Data de Nascimento *</Label>
            <Input
              type="date"
              value={form.data_nascimento}
              onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
              className={errors.data_nascimento ? 'border-red-500' : ''}
            />
            {errors.data_nascimento && <p className="text-red-500 text-xs mt-1">{errors.data_nascimento}</p>}
          </div>
          <div>
            <Label>Telefone *</Label>
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
              className={errors.telefone ? 'border-red-500' : ''}
            />
            {errors.telefone && <p className="text-red-500 text-xs mt-1">{errors.telefone}</p>}
          </div>
          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="lgpd"
              checked={form.lgpd_consent}
              onCheckedChange={(v) => setForm({ ...form, lgpd_consent: !!v })}
              className={errors.lgpd_consent ? 'border-red-500' : ''}
            />
            <Label htmlFor="lgpd" className="text-sm text-muted-foreground cursor-pointer">
              Autorizo o tratamento dos meus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD). *
            </Label>
          </div>
          {errors.lgpd_consent && <p className="text-red-500 text-xs">{errors.lgpd_consent}</p>}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...</>
            ) : saved ? (
              '✅ Perfil atualizado!'
            ) : (
              <><Save className="w-4 h-4 mr-1" /> Salvar Alterações</>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}

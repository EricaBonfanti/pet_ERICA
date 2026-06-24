import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PawPrint } from 'lucide-react';

export default function PetForm({ pet, tutores, onSubmit, onCancel, currentUserId, isStaff }) {
  const [form, setForm] = useState({
    nome_pet: pet?.nome_pet || '',
    especie: pet?.especie || 'Cão',
    raca: pet?.raca || '',
    porte: pet?.porte || 'Medio',
    idade: pet?.idade || '',
    id_tutor: pet?.id_tutor || (isStaff ? '' : currentUserId),
    observacoes: pet?.observacoes || '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.nome_pet.trim()) e.nome_pet = 'Este campo é obrigatório';
    if (!form.raca.trim()) e.raca = 'Este campo é obrigatório';
    if (!form.id_tutor) e.id_tutor = 'Este campo é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...form, idade: form.idade ? Number(form.idade) : null });
    }
  };

  const fieldClass = (field) =>
    errors[field] ? 'border-destructive ring-destructive/30 ring-2' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nome_pet">Nome do Pet *</Label>
          <Input
            id="nome_pet"
            value={form.nome_pet}
            onChange={(e) => setForm({ ...form, nome_pet: e.target.value })}
            className={fieldClass('nome_pet')}
            placeholder="Ex: Rex"
          />
          {errors.nome_pet && <p className="text-xs text-destructive mt-1">{errors.nome_pet}</p>}
        </div>
        <div>
          <Label htmlFor="especie">Espécie *</Label>
          <Select value={form.especie} onValueChange={(v) => setForm({ ...form, especie: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cão">Cão</SelectItem>
              <SelectItem value="Gato">Gato</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="raca">Raça *</Label>
          <Input
            id="raca"
            value={form.raca}
            onChange={(e) => setForm({ ...form, raca: e.target.value })}
            className={fieldClass('raca')}
            placeholder="Ex: Golden Retriever"
          />
          {errors.raca && <p className="text-xs text-destructive mt-1">{errors.raca}</p>}
        </div>
        <div>
          <Label htmlFor="porte">Porte *</Label>
          <Select value={form.porte} onValueChange={(v) => setForm({ ...form, porte: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pequeno">Pequeno</SelectItem>
              <SelectItem value="Medio">Médio</SelectItem>
              <SelectItem value="Grande">Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="idade">Idade (anos)</Label>
          <Input
            id="idade"
            type="number"
            min="0"
            value={form.idade}
            onChange={(e) => setForm({ ...form, idade: e.target.value })}
            placeholder="Ex: 3"
          />
        </div>

        {isStaff && (
          <div className="sm:col-span-2">
            <Label htmlFor="id_tutor">Tutor *</Label>
            <Select value={form.id_tutor} onValueChange={(v) => setForm({ ...form, id_tutor: v })}>
              <SelectTrigger className={fieldClass('id_tutor')}>
                <SelectValue placeholder="Selecione o tutor" />
              </SelectTrigger>
              <SelectContent>
                {tutores?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name || t.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.id_tutor && <p className="text-xs text-destructive mt-1">{errors.id_tutor}</p>}
          </div>
        )}

        <div className="sm:col-span-2">
          <Label htmlFor="obs">Observações</Label>
          <Textarea
            id="obs"
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            placeholder="Alergias, medicamentos, comportamento..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          <PawPrint className="w-4 h-4 mr-2" />
          {pet ? 'Atualizar Pet' : 'Cadastrar Pet'}
        </Button>
      </div>
    </form>
  );
}
import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarDays, Clock, AlertTriangle } from 'lucide-react';
import { SERVICOS_AVULSOS, getPrecoAvulso } from '@/lib/pricing';
import { hasConflito, getDuracaoMinutos, getSlotsDisponiveis } from '@/lib/agendamentoUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SERVICOS_COBERTOS_PLANO = ['Banho', 'Tosa', 'Hidratação', 'Corte de unha', 'Limpeza de ouvido'];

// Extrai "YYYY-MM-DD" e "HH:mm" (no horário LOCAL do navegador) de uma string data_hora
// vinda do banco (timestamptz, em UTC). Importante: não usar slice/split na string crua,
// pois ela está em UTC e precisa ser convertida pro fuso local — senão a hora exibida
// no formulário não bate com a hora real do agendamento.
function splitDataHora(data_hora) {
  if (!data_hora) return { data: '', hora: '' };
  const d = new Date(data_hora);
  if (Number.isNaN(d.getTime())) return { data: '', hora: '' };
  const pad = (n) => String(n).padStart(2, '0');
  const data = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hora = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { data, hora };
}

export default function AgendamentoForm({
  agendamento, pets, clientes, agendamentosExistentes = [], allPets,
  onSubmit, onCancel, isStaff, currentUser,
}) {
  const inicial = splitDataHora(agendamento?.data_hora);

  const [form, setForm] = useState({
    data: inicial.data,
    hora: inicial.hora,        // só preenchido ao clicar num slot
    servico: agendamento?.servico || '',
    status: agendamento?.status || 'Pendente',
    id_cliente: agendamento?.id_cliente || (isStaff ? '' : currentUser?.id),
    id_pet: agendamento?.id_pet || '',
    observacoes: agendamento?.observacoes || '',
    valor: agendamento?.valor != null ? String(agendamento.valor) : '',
    tipo_cobranca: agendamento?.tipo_cobranca || 'avulso',
  });
  const [errors, setErrors] = useState({});

  // petsMap com TODOS os pets do pet shop (para calcular porte dos agendamentos existentes)
  const petsMap = useMemo(() => {
    const map = {};
    (allPets || pets || []).forEach((p) => { map[p.id] = p; });
    return map;
  }, [allPets, pets]);

  const selectedPet = petsMap[form.id_pet];
  const duracaoMin = getDuracaoMinutos(selectedPet?.porte || 'Medio');

  // Slots calculados para o dia selecionado
  const slots = useMemo(() => {
    if (!form.data) return [];
    return getSlotsDisponiveis(
      form.data,
      agendamentosExistentes,
      petsMap,
      duracaoMin,
      agendamento?.id, // ignora o próprio agendamento ao editar
    );
  }, [form.data, agendamentosExistentes, petsMap, duracaoMin, agendamento?.id]);

  const slotSelecionado = slots.find((s) => s.label === form.hora);
  // IMPORTANTE: usar new Date(...).toISOString() em vez de string crua "${data}T${hora}".
  // O construtor Date interpreta "YYYY-MM-DDTHH:mm" (sem timezone) como horário LOCAL do
  // navegador, e toISOString() converte isso pro UTC certo — exatamente igual ao que
  // getSlotsDisponiveis já faz para montar cada slot. Antes, a string crua era enviada
  // direto pro Supabase, que assume UTC, causando um desvio de horário (igual ao fuso
  // local) entre o que aparecia disponível/ocupado na grade e o que era salvo de fato —
  // por isso dois agendamentos no "mesmo" horário visível não eram detectados como conflito.
  const dataHoraCompleta = form.data && form.hora
    ? new Date(`${form.data}T${form.hora}`).toISOString()
    : '';

  const validate = () => {
    const e = {};
    if (!form.data) e.data = 'Selecione uma data';
    if (!form.hora) e.hora = 'Selecione um horário disponível';
    if (!form.servico) e.servico = 'Este campo é obrigatório';
    if (!form.id_pet) e.id_pet = 'Este campo é obrigatório';
    if (isStaff && !form.id_cliente) e.id_cliente = 'Este campo é obrigatório';
    if (form.tipo_cobranca === 'avulso' && SERVICOS_AVULSOS[form.servico] && !form.valor) {
      e.valor = 'Valor é obrigatório para serviço avulso';
    }
    if (form.data && form.hora) {
      const agora = new Date();
      const horario = new Date(dataHoraCompleta);
      if (horario <= agora) e.hora = 'Horário deve ser no futuro';
    }
    // Se o slot foi marcado como ocupado (segurança extra)
    if (slotSelecionado && !slotSelecionado.disponivel) {
      e.hora = 'Este horário está ocupado';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const selectedClientPets = isStaff
    ? (pets || []).filter((p) => !form.id_cliente || p.id_tutor === form.id_cliente)
    : (pets || []).filter((p) => p.id_tutor === currentUser?.id);

  const handleServicoChange = (servico) => {
    const updates = { servico };
    if (form.tipo_cobranca === 'avulso') {
      const preco = getPrecoAvulso(servico);
      updates.valor = preco != null ? String(preco) : '';
    } else {
      updates.valor = '0';
    }
    setForm((f) => ({ ...f, ...updates }));
  };

  const handleTipoCobrancaChange = (tipo) => {
    if (tipo === 'coberto_pelo_plano') {
      setForm((f) => ({ ...f, tipo_cobranca: tipo, valor: '0' }));
    } else {
      const preco = getPrecoAvulso(form.servico);
      setForm((f) => ({ ...f, tipo_cobranca: tipo, valor: preco != null ? String(preco) : '' }));
    }
  };

  // Ao trocar data ou pet, limpa o horário selecionado
  const handleDataChange = (novaData) => {
    setForm((f) => ({ ...f, data: novaData, hora: '' }));
    setErrors((e) => ({ ...e, data: undefined, hora: undefined }));
  };

  const handlePetChange = (idPet) => {
    setForm((f) => ({ ...f, id_pet: idPet, hora: '' })); // limpa hora pois duração muda
  };

  const handleSelectSlot = (slot) => {
    if (!slot.disponivel) return; // bloqueado, não faz nada
    setForm((f) => ({ ...f, hora: slot.label }));
    setErrors((e) => ({ ...e, hora: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const selPet = (pets || []).find((p) => p.id === form.id_pet);
    const selCliente = isStaff
      ? (clientes || []).find((c) => c.id === form.id_cliente)
      : currentUser;
    onSubmit({
      data_hora: dataHoraCompleta,
      servico: form.servico,
      status: form.status,
      id_cliente: form.id_cliente,
      id_pet: form.id_pet,
      observacoes: form.observacoes,
      valor: form.valor ? Number(form.valor) : null,
      tipo_cobranca: form.tipo_cobranca,
      nome_pet: selPet?.nome_pet || '',
      nome_cliente: selCliente?.full_name || selCliente?.email || '',
    });
  };

  const fieldClass = (field) =>
    errors[field] ? 'border-destructive ring-destructive/30 ring-2' : '';

  const servicoAvulso = SERVICOS_AVULSOS[form.servico] != null;
  const slotsLivres = slots.filter((s) => s.disponivel).length;

  // Data mínima = hoje
  // toISOString() usa UTC — à noite no Brasil (UTC-3) isso já é "amanhã" em UTC,
  // o que bloquearia escolher o dia de hoje no calendário. Usamos a data local aqui.
  const agora = new Date();
  const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Cliente (staff) */}
        {isStaff && (
          <div>
            <Label>Cliente *</Label>
            <Select value={form.id_cliente} onValueChange={(v) => setForm((f) => ({ ...f, id_cliente: v, id_pet: '', hora: '' }))}>
              <SelectTrigger className={fieldClass('id_cliente')}>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {(clientes || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.id_cliente && <p className="text-xs text-destructive mt-1">{errors.id_cliente}</p>}
          </div>
        )}

        {/* Pet */}
        <div>
          <Label>Pet *</Label>
          <Select value={form.id_pet} onValueChange={handlePetChange}>
            <SelectTrigger className={fieldClass('id_pet')}>
              <SelectValue placeholder="Selecione o pet" />
            </SelectTrigger>
            <SelectContent>
              {selectedClientPets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome_pet} ({p.raca}) — {p.porte || 'Médio'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.id_pet && <p className="text-xs text-destructive mt-1">{errors.id_pet}</p>}
          {selectedPet && (
            <p className="text-xs text-muted-foreground mt-1">
              ⏱ Duração: <strong>{duracaoMin >= 60 ? `${duracaoMin / 60}h` : `${duracaoMin}min`}</strong> (porte {selectedPet.porte})
            </p>
          )}
        </div>

        {/* Serviço */}
        <div>
          <Label>Serviço *</Label>
          <Select value={form.servico} onValueChange={handleServicoChange}>
            <SelectTrigger className={fieldClass('servico')}>
              <SelectValue placeholder="Selecione o serviço" />
            </SelectTrigger>
            <SelectContent>
              {SERVICOS_COBERTOS_PLANO.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}{SERVICOS_AVULSOS[s] ? ` — R$ ${SERVICOS_AVULSOS[s].toFixed(2).replace('.', ',')}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.servico && <p className="text-xs text-destructive mt-1">{errors.servico}</p>}
        </div>

        {/* Data */}
        <div>
          <Label>Data *</Label>
          <Input
            type="date"
            min={hoje}
            value={form.data}
            onChange={(e) => handleDataChange(e.target.value)}
            className={fieldClass('data')}
          />
          {errors.data && <p className="text-xs text-destructive mt-1">{errors.data}</p>}
        </div>

        {/* Grade de slots — ocupa linha inteira, aparece assim que a Data é preenchida.
            Antes exigia Data + Pet (por isso só "aparecia" no Editar, onde o Pet já vem
            pré-selecionado). Agora aparece igual no Agendar e no Editar; se o Pet ainda
            não foi escolhido, usa duração padrão (Médio/60min) e recalcula quando escolher. */}
        {form.data && (
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Horário disponível *
                {form.data && (
                  <span className="font-normal text-muted-foreground ml-1">
                    — {format(new Date(form.data + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </span>
                )}
              </Label>
              <span className="text-xs text-muted-foreground">{slotsLivres} livre{slotsLivres !== 1 ? 's' : ''}</span>
            </div>

            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Carregando horários…</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {slots.map((slot) => {
                  const isSelecionado = slot.label === form.hora;
                  return (
                    <button
                      key={slot.label}
                      type="button"
                      disabled={!slot.disponivel}
                      onClick={() => handleSelectSlot(slot)}
                      title={
                        !slot.disponivel
                          ? `Ocupado: ${slot.conflito?.nome_pet || 'pet'} (${slot.conflito?.servico || ''})`
                          : `Selecionar ${slot.label}`
                      }
                      className={`py-2 px-1 rounded-xl text-xs font-semibold border-2 transition-all focus:outline-none ${
                        isSelecionado
                          ? 'border-primary bg-primary text-primary-foreground shadow'
                          : slot.disponivel
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer'
                            : 'border-red-200 bg-red-50 text-red-300 cursor-not-allowed line-through'
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>🟢 Livre</span>
              <span>🔵 Selecionado</span>
              <span>🔴 Ocupado</span>
            </div>

            {errors.hora && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />{errors.hora}
              </p>
            )}
            {form.hora && !errors.hora && (
              <p className="text-xs text-emerald-600 mt-1">
                ✅ Horário selecionado: <strong>{form.hora}</strong>
                {' — '}previsão de término: <strong>
                  {(() => {
                    const [h, m] = form.hora.split(':').map(Number);
                    const fim = new Date(0, 0, 0, h, m + duracaoMin);
                    return `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`;
                  })()}
                </strong>
              </p>
            )}
          </div>
        )}

        {/* Status (staff) */}
        {isStaff && (
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Confirmado">Confirmado</SelectItem>
                <SelectItem value="Concluido">Concluído</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tipo de cobrança */}
        {servicoAvulso && (
          <div className="sm:col-span-2">
            <Label>Tipo de Cobrança</Label>
            <div className="flex gap-2 mt-1.5">
              <button type="button" onClick={() => handleTipoCobrancaChange('coberto_pelo_plano')}
                className={`flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.tipo_cobranca === 'coberto_pelo_plano'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-border text-muted-foreground hover:border-slate-300'
                }`}>
                🛡️ Coberto pelo plano
              </button>
              <button type="button" onClick={() => handleTipoCobrancaChange('avulso')}
                className={`flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.tipo_cobranca === 'avulso'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-slate-300'
                }`}>
                💰 Avulso
              </button>
            </div>
          </div>
        )}

        {/* Valor */}
        {form.tipo_cobranca === 'avulso' && servicoAvulso && (
          <div>
            <Label>Valor (R$) *</Label>
            <Input
              type="number" min="0" step="0.01"
              value={form.valor}
              onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
              placeholder="Preenchido automaticamente"
              className={fieldClass('valor')}
            />
            {errors.valor && <p className="text-xs text-destructive mt-1">{errors.valor}</p>}
          </div>
        )}

        {/* Observações */}
        <div className="sm:col-span-2">
          <Label>Observações</Label>
          <Textarea
            value={form.observacoes}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            placeholder="Informações adicionais..."
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">
          <CalendarDays className="w-4 h-4 mr-2" />
          {agendamento ? 'Atualizar' : 'Agendar'}
        </Button>
      </div>
    </form>
  );
}

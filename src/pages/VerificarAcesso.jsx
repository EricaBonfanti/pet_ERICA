import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, Key, Loader2, LogOut, ArrowRight } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/roleUtils';

export default function VerificarAcesso() {
  const { user, logout } = useAuth();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const role = user?.role || 'cliente';

  useEffect(() => {
    if (role === 'cliente') {
      window.location.href = '/';
      return;
    }
    const verified = sessionStorage.getItem('petlify_2fa_verified');
    if (verified === 'true') {
      window.location.href = '/';
      return;
    }
    setChecking(false);
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      if (role === 'funcionario') {
        if (key.length !== 6) {
          setError('A chave de acesso deve ter 6 dígitos.');
          setLoading(false);
          return;
        }
        if (currentUser.chave_acesso && key === currentUser.chave_acesso) {
          sessionStorage.setItem('petlify_2fa_verified', 'true');
          window.location.href = '/';
        } else {
          setError('Chave de acesso inválida.');
        }
      } else if (role === 'dono' || role === 'admin') {
        if (!currentUser.chave_master || key !== currentUser.chave_master) {
          setError('Chave master inválida.');
        } else {
          sessionStorage.setItem('petlify_2fa_verified', 'true');
          window.location.href = '/';
        }
      }
    } catch (err) {
      setError('Erro ao verificar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-5">
            {role === 'funcionario' ? <Key className="w-8 h-8 text-white" /> : <Shield className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Verificação de Acesso</h1>
          <p className="text-muted-foreground mt-2">
            {role === 'funcionario' ? 'Digite sua chave de acesso de 6 dígitos' : 'Digite a chave master de administração'}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Shield className="w-3.5 h-3.5" />
            {ROLE_LABELS[role] || 'Funcionário'}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {role === 'funcionario' ? (
              <div className="space-y-3">
                <Label>Chave de Acesso</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={key} onChange={setKey} autoFocus>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                      <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Chave Master</Label>
                <Input type="password" placeholder="Digite a chave master" value={key} onChange={(e) => setKey(e.target.value)} className="h-12" autoFocus required />
              </div>
            )}
            <Button type="submit" className="w-full h-12 font-medium" disabled={loading || (role === 'funcionario' && key.length < 6) || (role !== 'funcionario' && !key)}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</> : <><span>Acessar Sistema</span><ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </form>
        </div>
        <div className="text-center mt-6">
          <button onClick={() => logout(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" /> Sair e voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
}
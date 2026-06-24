import React, { useEffect, useState } from 'react';
import { base44, supabase } from '@/api/supabaseClient';
import { finalizeRegistration } from '@/lib/finalizeRegistration';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function FinalizarCadastro() {
  const [status, setStatus] = useState('loading'); // loading | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // Depois do clique no link de confirmação, o Supabase já autentica
        // o usuário automaticamente nesta página (sessão criada via URL).
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          throw new Error('Não foi possível confirmar seu e-mail. O link pode ter expirado.');
        }

        await finalizeRegistration(data.user.id);
        window.location.href = '/';
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.message || 'Erro ao finalizar cadastro.');
      }
    })();
  }, []);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-foreground mb-2">Não foi possível confirmar</h1>
          <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
          <a href="/register" className="text-primary font-medium hover:underline text-sm">
            Voltar para o cadastro
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Finalizando seu cadastro...</p>
      </div>
    </div>
  );
}

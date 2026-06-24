import React, { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Lock, Loader2, User, Phone, Calendar, Search, Store, MapPin } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { generateUniqueSlug } from "@/lib/slug";
import { finalizeRegistration } from "@/lib/finalizeRegistration";

const STORAGE_KEY = 'petlify_reg_data';

export default function Register() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get('tipo');

  // Determine registration mode
  const isInviteLink = !!slug;
  const mode = isInviteLink ? 'cliente' : (tipoParam === 'dono' ? 'dono' : tipoParam === 'cliente' ? 'cliente' : null);

  // States
  const [step, setStep] = useState(mode ? 'form' : 'role');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [lgpd, setLgpd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Dono fields
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");

  // Cliente fields
  const [searchShop, setSearchShop] = useState("");
  const [shopResults, setShopResults] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [searchingShop, setSearchingShop] = useState(false);
  const [inviteShopName, setInviteShopName] = useState("");

  // Load invite link pet shop
  useEffect(() => {
    if (isInviteLink && slug) {
      (async () => {
        try {
          const shops = await base44.entities.PetShop.filter({ slug }, '', 1);
          if (shops.length > 0) {
            setSelectedShop(shops[0]);
            setInviteShopName(shops[0].nome);
          } else {
            setError("Pet Shop não encontrado. Verifique o link ou cadastre-se como Dono.");
          }
        } catch (e) {
          setError("Erro ao buscar Pet Shop.");
        }
      })();
    }
  }, [isInviteLink, slug]);

  // Search shops for cliente
  const handleSearchShop = async () => {
    if (searchShop.length < 2) return;
    setSearchingShop(true);
    try {
      const results = await base44.entities.PetShop.filter({}, '', 20);
      const filtered = results.filter(s =>
        s.nome?.toLowerCase().includes(searchShop.toLowerCase())
      );
      setShopResults(filtered);
    } catch (e) {
      setError("Erro ao buscar Pet Shops.");
    } finally {
      setSearchingShop(false);
    }
  };

  // Validate CPF
  const handleCpfChange = (value) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 3) formatted = raw.slice(0, 3) + '.' + raw.slice(3);
    if (raw.length > 6) formatted = formatted.slice(0, 7) + '.' + formatted.slice(7);
    if (raw.length > 9) formatted = formatted.slice(0, 11) + '-' + formatted.slice(11);
    setCpf(formatted);
  };

  // Validate phone
  const handlePhoneChange = (value) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 0) formatted = '(' + raw.slice(0, 2);
    if (raw.length > 2) formatted += ') ' + raw.slice(2, 7);
    if (raw.length > 7) formatted += '-' + raw.slice(7, 11);
    setTelefone(formatted);
  };

  // Submit registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("A senha deve ter no mínimo 8 caracteres, com 1 letra maiúscula e 1 número");
      return;
    }

    if (!lgpd) {
      setError("Você precisa aceitar os termos de uso");
      return;
    }

    if (mode === 'cliente' && !selectedShop) {
      setError("Selecione um Pet Shop");
      return;
    }

    if (mode === 'dono' && !shopName.trim()) {
      setError("Informe o nome do Pet Shop");
      return;
    }

    // Store data in sessionStorage for post-OTP
    const regData = {
      mode,
      fullName,
      cpf: cpf.replace(/\D/g, ''),
      telefone: telefone.replace(/\D/g, ''),
      dataNascimento,
      email,
      shopName: shopName.trim(),
      shopAddress: shopAddress.trim(),
      selectedShopId: selectedShop?.id,
      selectedShopName: selectedShop?.nome,
      lgpd,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(regData));

    setLoading(true);
    try {
      const result = await base44.auth.register({ email, password });
      const userId = result?.user?.id || (await base44.auth.me())?.id;
      if (!userId) {
        throw new Error("Não foi possível obter o usuário recém-criado.");
      }
      await finalizeRegistration(userId);
      window.location.href = '/';
    } catch (err) {
      setError(err.message || "Falha no cadastro");
    } finally {
      setLoading(false);
    }
  };

  // === RENDER: Role Selection ===
  if (step === 'role') {
    return (
      <AuthLayout title="Como deseja se cadastrar?" subtitle="Escolha o tipo de conta" slogan>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-14 text-base font-medium justify-start gap-3 px-5"
            onClick={() => { window.location.href = '/register?tipo=dono'; }}
          >
            <Store className="w-5 h-5 text-primary" />
            <div className="text-left">
              <div>Sou Dono de Pet Shop</div>
              <div className="text-xs text-muted-foreground font-normal">Cadastre seu estabelecimento</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full h-14 text-base font-medium justify-start gap-3 px-5"
            onClick={() => { window.location.href = '/register?tipo=cliente'; }}
          >
            <User className="w-5 h-5 text-primary" />
            <div className="text-left">
              <div>Sou Cliente / Tutor</div>
              <div className="text-xs text-muted-foreground font-normal">Cuide dos seus pets</div>
            </div>
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
        </p>
      </AuthLayout>
    );
  }

  // === RENDER: Registration Form ===
  const isDono = mode === 'dono';
  const title = isDono ? "Cadastro do Pet Shop" : isInviteLink ? `Cadastro - ${inviteShopName}` : "Crie sua conta";
  const subtitle = isDono ? "Registre seu estabelecimento" : isInviteLink ? `Vincule-se ao ${inviteShopName}` : "Cadastre-se no Petlify";

  return (
    <AuthLayout title={title} subtitle={subtitle} slogan={!isInviteLink}
      footer={
        <>{/* Sem footer para não poluir */}</>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {isInviteLink && selectedShop && (
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">{selectedShop.nome}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="fullName" placeholder="Seu nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" placeholder="000.000.000-00" value={cpf} onChange={(e) => handleCpfChange(e.target.value)} className="h-12" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => handlePhoneChange(e.target.value)} className="h-12" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nasc">Data de Nascimento</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="nasc" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className="pl-10 h-12" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type="password" autoComplete="new-password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
            </div>
            <p className="text-xs text-muted-foreground">Mín. 8 caracteres, 1 maiúscula e 1 número</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar</Label>
            <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12" required />
          </div>
        </div>

        {/* === DONO: Pet Shop fields === */}
        {isDono && (
          <>
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-foreground mb-3">Dados do Pet Shop</p>
              <div className="space-y-2">
                <Label htmlFor="shopName">Nome do Estabelecimento</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="shopName" placeholder="Nome do seu Pet Shop" value={shopName} onChange={(e) => setShopName(e.target.value)} className="pl-10 h-12" required />
                </div>
              </div>
              <div className="space-y-2 mt-3">
                <Label htmlFor="shopAddress">Endereço</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="shopAddress" placeholder="Endereço completo" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} className="pl-10 h-12" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* === CLIENTE: Search Pet Shop === */}
        {mode === 'cliente' && !isInviteLink && (
          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium text-foreground mb-3">Seu Pet Shop</p>
            <div className="space-y-2">
              <Label>Buscar Pet Shop</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome do Pet Shop"
                    value={searchShop}
                    onChange={(e) => setSearchShop(e.target.value)}
                    className="pl-10 h-12"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchShop())}
                  />
                </div>
                <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={handleSearchShop} disabled={searchingShop}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {shopResults.length > 0 && (
                <div className="border rounded-lg divide-y mt-1 max-h-48 overflow-y-auto">
                  {shopResults.map((shop) => (
                    <button
                      key={shop.id}
                      type="button"
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${selectedShop?.id === shop.id ? 'bg-primary/10 text-primary font-medium' : ''}`}
                      onClick={() => setSelectedShop(shop)}
                    >
                      <Store className="w-3.5 h-3.5 shrink-0" />
                      <span>{shop.nome}</span>
                      {shop.endereco && <span className="text-xs text-muted-foreground ml-auto truncate max-w-[120px]">{shop.endereco}</span>}
                    </button>
                  ))}
                </div>
              )}

              {selectedShop && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 mt-1">
                  <Store className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{selectedShop.nome}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LGPD */}
        <div className="flex items-start gap-2 pt-1">
          <input
            type="checkbox"
            id="lgpd"
            checked={lgpd}
            onChange={(e) => setLgpd(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-input accent-primary"
          />
          <Label htmlFor="lgpd" className="text-xs text-muted-foreground leading-normal cursor-pointer">
            Aceito os termos de uso e política de privacidade do Petlify
          </Label>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando conta...</> : "Criar conta"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Já tem uma conta?{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
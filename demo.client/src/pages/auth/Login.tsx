import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TrendingUp, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function onSubmit(data: FormData) {
    setError('');
    try {
      await login(data.email, data.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login.');
    }
  }

  return (
    <div className="min-h-screen flex bg-brand-navy">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] p-12 border-r border-white/10">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-brand-gold flex items-center justify-center">
            <TrendingUp size={20} className="text-brand-navy" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">Gestão</div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-brand-beige">
              Financeira
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-white leading-snug">
            Controle financeiro<br />
            <span className="text-brand-gold">inteligente</span> para<br />
            distribuidoras.
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            Gerencie receitas, despesas, verbas e fluxo de caixa de todas as suas
            unidades em um só lugar.
          </p>
        </div>

        <p className="text-white/20 text-xs">Demo &copy; {new Date().getFullYear()}</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="size-9 rounded-xl bg-brand-gold flex items-center justify-center">
              <TrendingUp size={18} className="text-brand-navy" />
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight">Gestão</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-beige">
                Financeira
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Entrar</h2>
            <p className="text-gray-500 text-sm mb-6">Acesse sua conta para continuar</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-9"
                    autoComplete="email"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    className="pl-9"
                    autoComplete="current-password"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg px-3 py-2.5 text-sm text-red-700 bg-red-50 border border-red-200">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white mt-2"
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-gray-400">
              Demo: <span className="font-mono">admin@demo.com</span> /{' '}
              <span className="font-mono">Demo@123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  TrendingUp, Mail, Lock, Eye, EyeOff,
  AlertCircle, BarChart3, Shield, Activity, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

type FormData = z.infer<typeof schema>;

// Colors match reference image: all dark-navy bg, accent icon colors
const FEATURES = [
  {
    icon: BarChart3,
    iconColor: '#5b8fff',
    bg: 'rgba(15,35,110,0.65)',
    border: 'rgba(60,100,220,0.35)',
    label: 'Visão completa',
    desc: 'de toda a operação',
  },
  {
    icon: Shield,
    iconColor: '#f0a000',
    bg: 'rgba(15,35,110,0.65)',
    border: 'rgba(60,100,220,0.35)',
    label: 'Mais segurança',
    desc: 'nas decisões',
  },
  {
    icon: Activity,
    iconColor: '#5b8fff',
    bg: 'rgba(15,35,110,0.65)',
    border: 'rgba(60,100,220,0.35)',
    label: 'Resultados que',
    desc: 'geram crescimento',
  },
] as const;

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
    <div className="h-dvh flex overflow-hidden" style={{ background: '#040c1e' }}>

      {/* ── Global atmosphere — subtle blue radial in top-right quadrant ────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 72% 72% at 82% 25%, rgba(28,58,185,0.22) 0%, rgba(14,38,130,0.07) 55%, transparent 75%)',
        }}
        aria-hidden
      />

      {/* ── LEFT PANEL ──────────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col w-[52%] h-full px-14 py-12 relative overflow-hidden"
      >
        {/*
          Gold arcs — two concentric circles.
          Center placed at approx (-200px, 950px) from panel origin,
          so the visible right arc sweeps from (116px, 500px) through
          the lower-left area, framing the content from outside.
        */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: '1100px',
            height: '1100px',
            borderRadius: '50%',
            border: '1.5px solid rgba(251,178,60,0.48)',
            top: '400px',
            left: '-750px',
          }}
          aria-hidden
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: '860px',
            height: '860px',
            borderRadius: '50%',
            border: '1px solid rgba(251,178,60,0.22)',
            top: '445px',
            left: '-610px',
          }}
          aria-hidden
        />

        {/* ── Logo ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, ease: 'easeOut' }}
          className="flex items-center gap-3 shrink-0"
        >
          <div
            className="size-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: '#fbc654',
              boxShadow: '0 4px 18px rgba(251,198,84,0.30)',
            }}
          >
            <TrendingUp size={21} className="text-[#0f2860]" strokeWidth={2.5} />
          </div>
          <div>
            <div
              className="text-white font-black leading-tight"
              style={{ fontSize: '17px', letterSpacing: '-0.02em' }}
            >
              Gestão Financeira
            </div>
            <div
              className="text-white/30 font-semibold uppercase mt-0.5"
              style={{ fontSize: '9px', letterSpacing: '0.22em' }}
            >
              Plataforma Empresarial
            </div>
          </div>
        </motion.div>

        {/* ── Headline — 18vh below logo (~30% from top, matching reference) ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.58, ease: 'easeOut', delay: 0.1 }}
          className="mt-[18vh]"
        >
          <h1
            className="font-black text-white leading-[1.06]"
            style={{ fontSize: '3rem', letterSpacing: '-0.035em' }}
          >
            O controle que<br />
            impulsiona seus<br />
            <span
              style={{
                background: 'linear-gradient(90deg, #fbc654 0%, #f09800 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              resultados.
            </span>
          </h1>
          <p
            className="mt-5 leading-relaxed text-white/45"
            style={{ fontSize: '15px', maxWidth: '400px' }}
          >
            Gestão financeira completa para distribuidoras<br />
            que buscam eficiência e crescimento.
          </p>
        </motion.div>

        {/* ── Feature items — fixed gap below subtitle (~64% from top in reference) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, ease: 'easeOut', delay: 0.22 }}
          className="flex items-start gap-6 mt-14 shrink-0"
        >
          {FEATURES.map(f => (
            <div key={f.label} className="flex items-start gap-2.5">
              <div
                className="size-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: f.bg, border: `1px solid ${f.border}` }}
              >
                <f.icon size={15} style={{ color: f.iconColor }} strokeWidth={1.75} />
              </div>
              <div>
                <div
                  className="font-semibold text-white/80 leading-tight"
                  style={{ fontSize: '12.5px' }}
                >
                  {f.label}
                </div>
                <div className="text-white/38 leading-tight mt-0.5" style={{ fontSize: '11.5px' }}>
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Copyright — pushed to bottom ── */}
        <p className="mt-auto text-white/22" style={{ fontSize: '11px' }}>
          © 2026 Gestão Financeira · Versão Demo
        </p>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 h-full flex items-center justify-center p-8 relative overflow-hidden">

        {/* White-blue spotlight from above (large ambient) */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: '1050px',
            height: '1050px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(210,225,255,0.36) 0%, rgba(100,150,255,0.18) 22%, rgba(45,85,215,0.07) 52%, transparent 70%)',
            top: '-520px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          aria-hidden
        />

        {/* Blue glow circle — centered exactly behind the card */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: '560px',
            height: '560px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(50,100,255,0.30) 0%, rgba(30,70,200,0.12) 50%, transparent 76%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -52%)',
            filter: 'blur(28px)',
          }}
          aria-hidden
        />

        {/* Gold glow circle — upper-right of card, visible as warm halo */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(251,198,84,0.26) 0%, rgba(251,168,40,0.09) 55%, transparent 80%)',
            top: '20%',
            right: '5%',
            filter: 'blur(22px)',
          }}
          aria-hidden
        />

        {/* ── Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.52, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.08 }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div
              className="size-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#fbc654', boxShadow: '0 4px 16px rgba(251,198,84,0.35)' }}
            >
              <TrendingUp size={18} className="text-[#0f2860]" strokeWidth={2.5} />
            </div>
            <div>
              <div
                className="text-white font-black"
                style={{ fontSize: '15px', letterSpacing: '-0.02em' }}
              >
                Gestão Financeira
              </div>
              <div
                className="text-white/30 font-semibold uppercase mt-0.5"
                style={{ fontSize: '9px', letterSpacing: '0.2em' }}
              >
                Plataforma Empresarial
              </div>
            </div>
          </div>

          <div
            className="bg-white relative"
            style={{
              borderRadius: '20px',
              padding: '28px 28px 24px',
              boxShadow:
                '0 0 0 1px rgba(255,255,255,0.08), ' +
                '0 0 70px rgba(80,130,255,0.22), ' +
                '0 40px 90px rgba(0,0,0,0.60), ' +
                '0 12px 40px rgba(20,55,200,0.22), ' +
                'inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            {/* Gold top sheen */}
            <div
              className="absolute inset-x-10 top-0 h-px pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(251,198,84,0.55), transparent)',
              }}
            />

            {/* Heading */}
            <div className="mb-5">
              <h2
                className="font-black text-gray-900 leading-none"
                style={{ fontSize: '22px', letterSpacing: '-0.025em' }}
              >
                Entrar
              </h2>
              <p className="text-gray-400 mt-2" style={{ fontSize: '13.5px' }}>
                Acesse sua conta para continuar.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* E-mail */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block font-semibold text-gray-700"
                  style={{ fontSize: '12.5px' }}
                >
                  E-mail
                </label>
                <div className="relative group">
                  <Mail
                    size={13}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300 transition-colors duration-150 group-focus-within:text-[#fbc654]"
                    aria-hidden
                  />
                  <input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-100 bg-white text-gray-900 placeholder:text-gray-300 outline-none hover:border-gray-200 focus-visible:border-[#fbc654] focus-visible:ring-2 focus-visible:ring-[#fbc654]/12"
                    style={{
                      fontSize: '13.5px',
                      transition: 'border-color 150ms ease, box-shadow 150ms ease',
                    }}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p
                    className="flex items-center gap-1.5 text-red-500"
                    style={{ fontSize: '11.5px' }}
                  >
                    <AlertCircle size={11} className="shrink-0" aria-hidden />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block font-semibold text-gray-700"
                  style={{ fontSize: '12.5px' }}
                >
                  Senha
                </label>
                <div className="relative group">
                  <Lock
                    size={13}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300 transition-colors duration-150 group-focus-within:text-[#fbc654]"
                    aria-hidden
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-gray-100 bg-white text-gray-900 placeholder:text-gray-300 outline-none hover:border-gray-200 focus-visible:border-[#fbc654] focus-visible:ring-2 focus-visible:ring-[#fbc654]/12"
                    style={{
                      fontSize: '13.5px',
                      transition: 'border-color 150ms ease, box-shadow 150ms ease',
                    }}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#fbc654] p-1 rounded-lg transition-colors duration-150"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword
                      ? <EyeOff size={13} strokeWidth={1.75} />
                      : <Eye size={13} strokeWidth={1.75} />}
                  </button>
                </div>
                {errors.password && (
                  <p
                    className="flex items-center gap-1.5 text-red-500"
                    style={{ fontSize: '11.5px' }}
                  >
                    <AlertCircle size={11} className="shrink-0" aria-hidden />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="sr-only"
                    aria-label="Lembrar-me"
                  />
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
                    style={{
                      background: rememberMe ? '#0f2860' : 'white',
                      border: `1.5px solid ${rememberMe ? '#0f2860' : '#d1d5db'}`,
                    }}
                  >
                    {rememberMe && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden>
                        <path
                          d="M1 3L3 5L7 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-gray-500" style={{ fontSize: '12.5px' }}>
                  Lembrar-me
                </span>
              </label>

              {/* Server error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-red-700 bg-red-50 border border-red-100"
                  role="alert"
                  aria-live="polite"
                  style={{ fontSize: '12.5px' }}
                >
                  <AlertCircle size={13} className="shrink-0 mt-px text-red-500" aria-hidden />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl text-white font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-0.5"
                style={{
                  fontSize: '14px',
                  letterSpacing: '-0.01em',
                  background: 'linear-gradient(180deg, #1d4494 0%, #0f2860 100%)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 8px rgba(15,40,96,0.35)',
                  transition: 'transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease',
                }}
                onMouseEnter={e => {
                  if (!isSubmitting) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow =
                      'inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 24px rgba(15,40,96,0.48)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    'inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 8px rgba(15,40,96,0.35)';
                }}
                onMouseDown={e => { if (!isSubmitting) e.currentTarget.style.transform = 'scale(0.99)'; }}
                onMouseUp={e => { if (!isSubmitting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight size={14} strokeWidth={2} />
                  </>
                )}
              </button>
            </form>

            {/* Divider + demo */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid #f0f2f5' }}>
              <p className="text-center text-gray-400" style={{ fontSize: '11px' }}>
                Demo:{' '}
                <span
                  className="font-mono font-medium"
                  style={{ color: '#4b5563', fontSize: '11px' }}
                  translate="no"
                >
                  admin@demo.com
                </span>
                {' · '}
                <span
                  className="font-mono font-medium"
                  style={{ color: '#4b5563', fontSize: '11px' }}
                  translate="no"
                >
                  Demo@123
                </span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

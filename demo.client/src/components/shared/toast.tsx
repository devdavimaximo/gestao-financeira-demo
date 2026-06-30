import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'info';

type ToastInput =
  | { title: string; description?: string; variant?: ToastType }
  | string;

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastCtx {
  toast: (input: ToastInput, type?: ToastType) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });

const ICON = { success: CheckCircle2, error: AlertCircle, info: Info } as const;

const STYLES: Record<ToastType, { container: string; icon: string }> = {
  success: {
    container: 'border-emerald-200 bg-white',
    icon: 'text-emerald-500',
  },
  error: {
    container: 'border-red-200 bg-white',
    icon: 'text-red-500',
  },
  info: {
    container: 'border-brand-blue/30 bg-white',
    icon: 'text-brand-blue',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts(ts => ts.map(t => t.id === id ? { ...t, exiting: true } : t));
    clearTimeout(timers.current[id]);
    setTimeout(() => {
      setToasts(ts => ts.filter(t => t.id !== id));
      delete timers.current[id];
    }, 180);
  }, []);

  const toast = useCallback((input: ToastInput, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    let message: string;
    let resolvedType: ToastType;

    if (typeof input === 'string') {
      message = input;
      resolvedType = type;
    } else {
      message = input.description ? `${input.title} — ${input.description}` : input.title;
      resolvedType = input.variant ?? 'success';
    }

    setToasts(ts => [...ts, { id, type: resolvedType, message }]);
    timers.current[id] = setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-label="Notificações"
      >
        {toasts.map(t => {
          const Icon = ICON[t.type];
          const s = STYLES[t.type];
          return (
            <div
              key={t.id}
              role="alert"
              className={cn(
                'pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-lg',
                'min-w-[300px] max-w-sm text-sm font-medium',
                s.container,
                t.exiting ? 'toast-out' : 'toast-in',
              )}
            >
              <Icon size={16} className={cn('shrink-0 mt-0.5', s.icon)} />
              <span className="flex-1 text-gray-800 leading-snug">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Fechar"
                className="shrink-0 -mt-0.5 -mr-1 w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return { toast: useContext(Ctx).toast };
}

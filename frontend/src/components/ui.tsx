import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
} from 'react'
import { AlertCircle, CheckCircle2, Loader2, MoreHorizontal, X } from 'lucide-react'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'soft' | 'ghost' | 'danger'
  loading?: boolean
}
export function Button({ variant = 'primary', loading, className, children, disabled, ...p }: BtnProps) {
  const styles = {
    primary: 'bg-mustard text-ink shadow-card hover:bg-mustard-dark',
    soft: 'bg-white text-ink border border-ink/10 hover:bg-cream hover:border-ink/20',
    ghost: 'text-ink/80 hover:bg-ink/5',
    danger: 'bg-terracotta-deep text-white hover:bg-[#843d2a]',
  }[variant]
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60', styles, className)}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function Field({ label, error, hint, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink/80">{label}</span>
      <input
        {...p}
        className={cx('w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] outline-none transition',
          'placeholder:text-ink/35 focus:border-mustard focus:ring-4 focus:ring-mustard/20',
          error ? 'border-terracotta' : 'border-ink/15', p.className)}
      />
      {error ? <span className="mt-1 block text-sm text-terracotta-deep">{error}</span>
        : hint ? <span className="mt-1 block text-xs text-ink/55">{hint}</span> : null}
    </label>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-ink/60">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> <span className="text-sm">{label}</span>
    </div>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4 fade" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={cx('pop max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-lift sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink/60 hover:bg-ink/5"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }: {
  title: string; message: ReactNode; confirmLabel: string; onConfirm: () => Promise<void>; onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-[15px] leading-relaxed text-ink/75">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" loading={busy} onClick={async () => { setBusy(true); try { await onConfirm() } finally { setBusy(false) } }}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

export type MenuItem = { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean }
export function Menu({ items, label = 'More actions' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') setOpen(false); return }
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className="rounded-lg p-1.5 text-ink/55 hover:bg-ink/5 hover:text-ink"><MoreHorizontal className="h-5 w-5" /></button>
      {open && (
        <div role="menu" className="pop absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-2xl border border-ink/10 bg-white py-1.5 shadow-lift">
          {items.map((it) => (
            <button key={it.label} role="menuitem" onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick() }}
              className={cx('flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-ivory', it.danger && 'text-terracotta-deep')}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink/20 bg-cream/70 px-6 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-mustard/20 text-mustard-deep">{icon}</div>
      <h3 className="text-xl">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-[15px] text-ink/65">{children}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

type Toast = { id: number; msg: string; kind: 'ok' | 'err' }
const ToastCtx = createContext<(msg: string, kind?: 'ok' | 'err') => void>(() => undefined)
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className="pop pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl bg-ink px-4 py-3 text-sm text-cream shadow-lift">
            {t.kind === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-mustard" /> : <AlertCircle className="h-4 w-4 shrink-0 text-terracotta" />}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

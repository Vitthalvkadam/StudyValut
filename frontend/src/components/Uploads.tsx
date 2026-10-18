import { useCallback, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { uploadFile } from '../lib/api'
import { cx } from './ui'

type Item = { id: number; name: string; progress: number; status: 'uploading' | 'done' | 'error'; error?: string }

export function useUploads(folderId: string | null, onDone: () => void) {
  const [items, setItems] = useState<Item[]>([])
  const counter = useRef(0)
  const patch = (id: number, p: Partial<Item>) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...p } : i)))

  const add = useCallback(async (files: File[]) => {
    const entries = files.map((f) => ({ id: ++counter.current, file: f }))
    setItems((l) => [...l, ...entries.map((e) => ({ id: e.id, name: e.file.name, progress: 0, status: 'uploading' as const }))])
    for (const e of entries) {
      try {
        await uploadFile(e.file, folderId, (pct) => patch(e.id, { progress: pct }))
        patch(e.id, { progress: 100, status: 'done' })
        onDone()
        setTimeout(() => setItems((l) => l.filter((i) => i.id !== e.id)), 3500)
      } catch (err) {
        patch(e.id, { status: 'error', error: (err as Error).message })
      }
    }
  }, [folderId, onDone])

  const panel = items.length === 0 ? null : (
    <div className="fixed bottom-24 left-4 right-4 z-40 space-y-2 md:bottom-6 md:left-auto md:right-6 md:w-80" aria-live="polite">
      {items.map((i) => (
        <div key={i.id} className="pop rounded-2xl border border-ink/10 bg-white p-3.5 shadow-lift">
          <div className="flex items-center gap-2.5">
            {i.status === 'done' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-sage-deep" /> : i.status === 'error' ? <AlertCircle className="h-4 w-4 shrink-0 text-terracotta-deep" /> : null}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{i.name}</span>
            {i.status !== 'uploading' && <button aria-label="Dismiss" onClick={() => setItems((l) => l.filter((x) => x.id !== i.id))} className="rounded p-0.5 text-ink/50 hover:bg-ink/5"><X className="h-4 w-4" /></button>}
          </div>
          {i.status === 'uploading' && (
            <div className="mt-2.5 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-mustard transition-all" style={{ width: `${i.progress}%` }} /></div>
              <span className="w-9 text-right text-xs tabular-nums text-ink/55">{i.progress}%</span>
            </div>
          )}
          {i.status === 'error' && <p className={cx('mt-1.5 text-xs text-terracotta-deep')}>{i.error}</p>}
        </div>
      ))}
    </div>
  )
  return { add, panel }
}

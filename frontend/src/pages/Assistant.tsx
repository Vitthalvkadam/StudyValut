import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowUp, FileText, MessageSquarePlus, Paperclip, PanelLeft, Sparkles, Trash2, X } from 'lucide-react'
import { api, type ChatMessage, type Conversation, type FileItem } from '../lib/api'
import { formatDate } from '../lib/format'
import { KindTile } from '../components/FileCard'
import { Button, ConfirmDialog, cx, EmptyState, Modal, Spinner, useToast } from '../components/ui'

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p.startsWith('`') && p.endsWith('`') && p.length > 2 ? <code key={i} className="rounded bg-ink/10 px-1 py-0.5 font-mono text-[13px]">{p.slice(1, -1)}</code> : <Fragment key={i}>{p}</Fragment>)
}

function Bubble({ m }: { m: ChatMessage }) {
  const mine = m.role === 'user'
  return (
    <div className={cx('flex gap-3', mine && 'justify-end')}>
      {!mine && <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lavender/60 text-lavender-deep"><Sparkles className="h-4 w-4" /></span>}
      <div className={cx('max-w-[85%] rounded-3xl px-4.5 py-3 text-[15px] leading-relaxed', mine ? 'rounded-br-lg bg-mustard/30 px-4 py-3' : 'rounded-bl-lg bg-white px-4 py-3 shadow-card')}>
        {m.attachmentName && <p className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-ink/5 px-2 py-1 text-xs font-medium"><FileText className="h-3.5 w-3.5" />{m.attachmentName}</p>}
        <div className="whitespace-pre-wrap break-words">{inline(m.content)}</div>
      </div>
    </div>
  )
}

function VaultPicker({ onPick, onClose }: { onPick: (f: FileItem) => void; onClose: () => void }) {
  const [files, setFiles] = useState<FileItem[] | null>(null)
  useEffect(() => { api.files({ sort: 'date' }).then((l) => setFiles(l.filter((f) => f.kind === 'pdf' || f.kind === 'image'))).catch(() => setFiles([])) }, [])
  return (
    <Modal title="Choose from your vault" onClose={onClose}>
      {files === null ? <Spinner /> : files.length === 0 ? <p className="py-6 text-center text-sm text-ink/60">No PDFs or images in your vault yet.</p> : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">{files.map((f) => (
          <li key={f.id}><button onClick={() => { onPick(f); onClose() }} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-card hover:shadow-lift"><KindTile kind={f.kind} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name}</span></button></li>))}
        </ul>)}
    </Modal>
  )
}

const SUGGESTIONS = ['Explain photosynthesis like I’m new to biology', 'Quiz me on the French Revolution', 'Give me a study plan for a calculus exam in two weeks']

export default function Assistant() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [convos, setConvos] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [text, setText] = useState('')
  const [upload, setUpload] = useState<File | null>(null)
  const [vaultFile, setVaultFile] = useState<{ id: string; name: string } | null>(null)
  const [picker, setPicker] = useState(false)
  const [sending, setSending] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Conversation | null>(null)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => { api.chatStatus().then((s) => setConfigured(s.configured)).catch(() => setConfigured(false)); api.conversations().then(setConvos).catch((e) => toast(e.message, 'err')) }, [toast])
  useEffect(() => {
    const fid = params.get('file')
    if (fid) { api.file(fid).then((f) => setVaultFile({ id: f.id, name: f.name })).catch(() => toast('That file could not be attached', 'err')); setParams({}, { replace: true }) }
  }, [params, setParams, toast])
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, sending])

  const open = useCallback(async (id: string) => {
    setActiveId(id); setListOpen(false); setLoadingChat(true); setError('')
    try { setMessages((await api.conversation(id)).messages) } catch (e) { toast((e as Error).message, 'err') } finally { setLoadingChat(false) }
  }, [toast])
  const newChat = () => { setActiveId(null); setMessages([]); setListOpen(false); setError('') }

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    const body = text.trim()
    if ((!body && !upload && !vaultFile) || sending) return
    setSending(true); setError('')
    const temp: ChatMessage = { id: 'tmp', role: 'user', content: body || 'Please explain this file and highlight the key points for studying.', attachmentName: upload?.name ?? vaultFile?.name ?? null, createdAt: new Date().toISOString() }
    setMessages((m) => [...m, temp])
    const snapshot = { body, upload, vaultFile }
    setText(''); setUpload(null); setVaultFile(null)
    try {
      let id = activeId
      if (!id) { const c = await api.createConversation(); id = c.id; setActiveId(id) }
      const r = await api.sendMessage(id, body, snapshot.upload, snapshot.vaultFile?.id)
      setMessages((m) => [...m.filter((x) => x.id !== 'tmp'), r.userMessage, r.assistantMessage])
      setConvos((l) => [r.conversation, ...l.filter((c) => c.id !== r.conversation.id)])
    } catch (er) {
      setMessages((m) => m.filter((x) => x.id !== 'tmp'))
      setText(snapshot.body); setUpload(snapshot.upload); setVaultFile(snapshot.vaultFile)
      setError((er as Error).message)
    } finally { setSending(false) }
  }

  const list = (
    <div className="flex h-full flex-col">
      <Button onClick={newChat} variant="soft" className="mb-3 w-full"><MessageSquarePlus className="h-4 w-4" /> New chat</Button>
      <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
        {convos.length === 0 && <p className="px-2 py-4 text-sm text-ink/55">Your conversations will appear here.</p>}
        {convos.map((c) => (
          <div key={c.id} className={cx('group flex items-center gap-1 rounded-xl pr-1', c.id === activeId ? 'bg-mustard/25' : 'hover:bg-ink/5')}>
            <button onClick={() => open(c.id)} className="min-w-0 flex-1 px-3 py-2.5 text-left"><span className="block truncate text-sm font-medium">{c.title}</span><span className="block text-xs text-ink/50">{formatDate(c.updatedAt)}</span></button>
            <button onClick={() => setToDelete(c)} aria-label={`Delete conversation ${c.title}`} className="rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 hover:text-terracotta-deep md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="grid h-[calc(100dvh-10.5rem)] gap-6 md:h-[calc(100dvh-8rem)] md:grid-cols-[16rem_1fr]">
      <aside className="hidden min-h-0 rounded-3xl bg-cream p-3 shadow-card md:block">{list}</aside>
      {listOpen && <Modal title="Conversations" onClose={() => setListOpen(false)}><div className="h-80">{list}</div></Modal>}

      <section className="flex min-h-0 flex-col rounded-3xl border border-ink/10 bg-cream shadow-card">
        <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
          <button onClick={() => setListOpen(true)} aria-label="Show conversations" className="rounded-lg p-1.5 hover:bg-ink/5 md:hidden"><PanelLeft className="h-5 w-5" /></button>
          <h1 className="font-display text-xl">Study Assistant</h1>
        </div>
        {configured === false && <p className="mx-4 mt-3 flex items-start gap-2 rounded-2xl bg-lavender/30 px-3.5 py-2.5 text-sm text-lavender-deep"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />The assistant isn’t switched on yet — the server needs a Gemini API key. Everything else in your vault works as usual.</p>}

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
          {loadingChat ? <Spinner /> : messages.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-8 w-8" />} title="What are you studying?">
              Ask a question, or attach a PDF or photo of your notes and I’ll explain it step by step.
              <span className="mt-4 flex flex-wrap justify-center gap-2">{SUGGESTIONS.map((s) => <button key={s} onClick={() => setText(s)} className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-xs font-medium hover:bg-ivory">{s}</button>)}</span>
            </EmptyState>
          ) : messages.map((m) => <Bubble key={m.id} m={m} />)}
          {sending && <div className="flex items-center gap-3 text-sm text-ink/55"><span className="grid h-8 w-8 place-items-center rounded-full bg-lavender/60 text-lavender-deep"><Sparkles className="h-4 w-4 animate-pulse" /></span>Thinking…</div>}
          <div ref={bottom} />
        </div>

        <form onSubmit={send} className="border-t border-ink/10 p-3">
          {error && <p role="alert" className="mb-2 rounded-xl bg-terracotta/15 px-3.5 py-2 text-sm text-terracotta-deep">{error}</p>}
          {(upload || vaultFile) && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm shadow-card"><FileText className="h-4 w-4 text-ink/60" /><span className="max-w-[14rem] truncate">{upload?.name ?? vaultFile?.name}</span>
              <button type="button" aria-label="Remove attachment" onClick={() => { setUpload(null); setVaultFile(null) }} className="rounded p-0.5 hover:bg-ink/5"><X className="h-4 w-4" /></button></div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-ink/15 bg-white p-2 focus-within:border-mustard focus-within:ring-4 focus-within:ring-mustard/20">
            <div className="flex">
              <button type="button" onClick={() => fileInput.current?.click()} aria-label="Attach a PDF or image from your device" className="rounded-xl p-2 text-ink/60 hover:bg-ink/5"><Paperclip className="h-5 w-5" /></button>
              <button type="button" onClick={() => setPicker(true)} aria-label="Attach a file from your vault" className="rounded-xl p-2 text-ink/60 hover:bg-ink/5"><FileText className="h-5 w-5" /></button>
              <input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif" className="sr-only" aria-label="Choose attachment" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUpload(f); setVaultFile(null) } e.target.value = '' }} />
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={8000} aria-label="Message" placeholder="Ask anything about your studies…"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
              className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] outline-none placeholder:text-ink/40" />
            <button type="submit" disabled={sending || (!text.trim() && !upload && !vaultFile)} aria-label="Send message" className="grid h-10 w-10 place-items-center rounded-xl bg-mustard shadow-card transition-colors hover:bg-mustard-dark disabled:opacity-50"><ArrowUp className="h-5 w-5" /></button>
          </div>
          <p className="mt-1.5 px-1 text-xs text-ink/45">PDFs and images up to 10 MB. Answers can contain mistakes — check important facts.</p>
        </form>
      </section>

      {picker && <VaultPicker onClose={() => setPicker(false)} onPick={(f) => { setVaultFile({ id: f.id, name: f.name }); setUpload(null) }} />}
      {toDelete && <ConfirmDialog title="Delete this conversation?" confirmLabel="Delete" onClose={() => setToDelete(null)} message={<>“{toDelete.title}” and its messages will be permanently deleted.</>}
        onConfirm={async () => { try { await api.deleteConversation(toDelete.id); setConvos((l) => l.filter((c) => c.id !== toDelete.id)); if (activeId === toDelete.id) newChat(); setToDelete(null); toast('Conversation deleted') } catch (e) { toast((e as Error).message, 'err') } }} />}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Eye, File as FileIcon, FileImage, FileSpreadsheet, FileText, FolderInput, Pencil, Presentation, Sparkles, Star, Trash2 } from 'lucide-react'
import { api, fileUrl, type FileItem, type FileKind, type Folder } from '../lib/api'
import { formatBytes, formatDate, kindTone } from '../lib/format'
import { Button, ConfirmDialog, cx, Field, Menu, Modal, useToast } from './ui'

export function KindIcon({ kind, className }: { kind: FileKind; className?: string }) {
  const C = { pdf: FileText, image: FileImage, text: FileText, document: FileText, presentation: Presentation, spreadsheet: FileSpreadsheet, file: FileIcon }[kind]
  return <C className={className} />
}

export function KindTile({ kind, size = 'md' }: { kind: FileKind; size?: 'md' | 'lg' }) {
  const t = kindTone[kind]
  return <div className={cx('grid shrink-0 place-items-center rounded-xl', t.bg, t.text, size === 'lg' ? 'h-14 w-14' : 'h-11 w-11')}><KindIcon kind={kind} className={size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'} /></div>
}

function MoveDialog({ file, onClose, onMoved }: { file: FileItem; onClose: () => void; onMoved: () => void }) {
  const [folders, setFolders] = useState<Folder[] | null>(null)
  const [target, setTarget] = useState<string | null>(file.folderId)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  useEffect(() => { api.allFolders().then(setFolders).catch((e) => toast(e.message, 'err')) }, [toast])
  const byId = new Map((folders ?? []).map((f) => [f.id, f]))
  const path = (f: Folder): string => { const parts: string[] = []; let c: Folder | undefined = f; let i = 0; while (c && i++ < 20) { parts.unshift(c.name); c = c.parentId ? byId.get(c.parentId) : undefined } return parts.join(' / ') }
  const options = (folders ?? []).map((f) => ({ id: f.id, label: path(f) })).sort((a, b) => a.label.localeCompare(b.label))
  const submit = async () => {
    setBusy(true)
    try { await api.moveFile(file.id, target); toast('File moved'); onMoved(); onClose() } catch (e) { toast((e as Error).message, 'err') } finally { setBusy(false) }
  }
  return (
    <Modal title={`Move “${file.name}”`} onClose={onClose}>
      <div className="max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-ink/10 bg-white p-2">
        {[{ id: null as string | null, label: 'My Vault (top level)' }, ...options].map((o) => (
          <label key={o.id ?? 'root'} className={cx('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-ivory', target === o.id && 'bg-mustard/20')}>
            <input type="radio" name="dest" checked={target === o.id} onChange={() => setTarget(o.id)} className="accent-[#C99A2E]" />{o.label}
          </label>
        ))}
        {folders === null && <p className="p-3 text-sm text-ink/55">Loading folders…</p>}
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit} disabled={target === file.folderId}>Move here</Button></div>
    </Modal>
  )
}

function RenameDialog({ file, onClose, onDone }: { file: FileItem; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(file.name)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true)
    try { await api.renameFile(file.id, name); toast('File renamed'); onDone(); onClose() } catch (er) { toast((er as Error).message, 'err') } finally { setBusy(false) }
  }
  return (
    <Modal title="Rename file" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="File name" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={200} />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy} disabled={!name.trim()}>Save name</Button></div>
      </form>
    </Modal>
  )
}

/** Shared file actions (rename, move, favorite, delete, download) used by every list of files. */
export function useFileActions(file: FileItem, onChange: () => void) {
  const nav = useNavigate()
  const toast = useToast()
  const [dialog, setDialog] = useState<'rename' | 'move' | 'delete' | null>(null)
  const toggleFav = async () => {
    try { await api.favoriteFile(file.id, !file.favorite); toast(file.favorite ? 'Removed from favorites' : 'Added to favorites'); onChange() } catch (e) { toast((e as Error).message, 'err') }
  }
  const items = [
    { label: 'Open', icon: <Eye className="h-4 w-4" />, onClick: () => nav(`/files/${file.id}`) },
    { label: 'Download', icon: <Download className="h-4 w-4" />, onClick: () => { window.location.href = fileUrl(file.id, 'download') } },
    ...(file.kind === 'pdf' || file.kind === 'image' ? [{ label: 'Ask the assistant', icon: <Sparkles className="h-4 w-4" />, onClick: () => nav(`/assistant?file=${file.id}`) }] : []),
    { label: file.favorite ? 'Unfavorite' : 'Favorite', icon: <Star className="h-4 w-4" />, onClick: toggleFav },
    { label: 'Rename', icon: <Pencil className="h-4 w-4" />, onClick: () => setDialog('rename') },
    { label: 'Move', icon: <FolderInput className="h-4 w-4" />, onClick: () => setDialog('move') },
    { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => setDialog('delete'), danger: true },
  ]
  const dialogs = (<>
    {dialog === 'rename' && <RenameDialog file={file} onClose={() => setDialog(null)} onDone={onChange} />}
    {dialog === 'move' && <MoveDialog file={file} onClose={() => setDialog(null)} onMoved={onChange} />}
    {dialog === 'delete' && (
      <ConfirmDialog title="Delete this file?" confirmLabel="Delete file" onClose={() => setDialog(null)}
        message={<>“{file.name}” will be permanently removed from your vault. This can’t be undone.</>}
        onConfirm={async () => { try { await api.deleteFile(file.id); toast('File deleted'); setDialog(null); onChange() } catch (e) { toast((e as Error).message, 'err') } }} />
    )}
  </>)
  return { items, dialogs, toggleFav, setDialog }
}

export function FileCard({ file, onChange, showFolder }: { file: FileItem; onChange: () => void; showFolder?: boolean }) {
  const nav = useNavigate()
  const { items, dialogs, toggleFav } = useFileActions(file, onChange)
  return (
    <>
      <div className="group relative flex items-center gap-3.5 rounded-2xl bg-white p-3.5 shadow-card transition-shadow hover:shadow-lift">
        <button onClick={() => nav(`/files/${file.id}`)} className="flex min-w-0 flex-1 items-center gap-3.5 text-left" aria-label={`Open ${file.name}`}>
          <KindTile kind={file.kind} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{file.name}</span>
            <span className="block truncate text-xs text-ink/55">{formatBytes(file.size)} · {formatDate(file.createdAt)}{showFolder && file.folderName ? ` · ${file.folderName}` : ''}</span>
          </span>
        </button>
        <button onClick={toggleFav} aria-label={file.favorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={file.favorite}
          className={cx('rounded-lg p-1.5 transition-colors hover:bg-ink/5', file.favorite ? 'text-mustard-dark' : 'text-ink/30 hover:text-ink/60')}>
          <Star className={cx('h-[18px] w-[18px]', file.favorite && 'fill-mustard')} />
        </button>
        <Menu items={items} />
      </div>
      {dialogs}
    </>
  )
}

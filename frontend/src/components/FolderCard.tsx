import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { api, type Folder } from '../lib/api'
import { FOLDER_COLORS, folderTone } from '../lib/format'
import { Button, ConfirmDialog, cx, Field, Menu, Modal, useToast } from './ui'

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink/80">Color</legend>
      <div className="flex gap-3">
        {FOLDER_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} aria-label={c} aria-pressed={value === c}
            className={cx('h-9 w-9 rounded-full transition', folderTone[c].tab, value === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-cream' : 'hover:scale-105')} />
        ))}
      </div>
    </fieldset>
  )
}

export function FolderDialog({ folder, parentId, onClose, onDone }: { folder?: Folder; parentId?: string | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(folder?.name ?? '')
  const [color, setColor] = useState(folder?.color ?? 'mustard')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      if (folder) await api.updateFolder(folder.id, name, color)
      else await api.createFolder(name, parentId ?? null, color)
      toast(folder ? 'Folder updated' : 'Folder created'); onDone(); onClose()
    } catch (er) { setError((er as Error).message) } finally { setBusy(false) }
  }
  return (
    <Modal title={folder ? 'Edit folder' : 'New folder'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Folder name" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={100} placeholder="e.g. Organic Chemistry" error={error} />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy} disabled={!name.trim()}>{folder ? 'Save folder' : 'Create folder'}</Button></div>
      </form>
    </Modal>
  )
}

export function FolderCard({ folder, onChange }: { folder: Folder; onChange: () => void }) {
  const nav = useNavigate()
  const toast = useToast()
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)
  const tone = folderTone[folder.color] ?? folderTone.mustard
  const parts = [`${folder.fileCount} ${folder.fileCount === 1 ? 'file' : 'files'}`]
  if (folder.folderCount) parts.push(`${folder.folderCount} ${folder.folderCount === 1 ? 'folder' : 'folders'}`)
  return (
    <>
      <div className="relative mt-3">
        <span className={cx('absolute -top-3 left-0 h-3.5 w-20 rounded-t-xl', tone.tab)} aria-hidden />
        <div className="rounded-2xl rounded-tl-none bg-white shadow-card transition-shadow hover:shadow-lift">
          <div className="flex items-start gap-2 p-4">
            <button onClick={() => nav(`/vault/${folder.id}`)} className="min-w-0 flex-1 text-left" aria-label={`Open folder ${folder.name}`}>
              <span className="block truncate font-display text-lg leading-tight">{folder.name}</span>
              <span className="mt-1 block text-xs text-ink/55">{parts.join(' · ')}</span>
            </button>
            <Menu label={`Actions for ${folder.name}`} items={[
              { label: 'Open', onClick: () => nav(`/vault/${folder.id}`) },
              { label: 'Rename or recolor', icon: <Pencil className="h-4 w-4" />, onClick: () => setDialog('edit') },
              { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => setDialog('delete'), danger: true },
            ]} />
          </div>
        </div>
      </div>
      {dialog === 'edit' && <FolderDialog folder={folder} onClose={() => setDialog(null)} onDone={onChange} />}
      {dialog === 'delete' && (
        <ConfirmDialog title="Delete this folder?" confirmLabel="Delete folder" onClose={() => setDialog(null)}
          message={<>“{folder.name}” and everything inside it — {folder.fileCount} {folder.fileCount === 1 ? 'file' : 'files'}{folder.folderCount ? ` and ${folder.folderCount} subfolder${folder.folderCount === 1 ? '' : 's'}` : ''} — will be permanently deleted.</>}
          onConfirm={async () => { try { await api.deleteFolder(folder.id); toast('Folder deleted'); setDialog(null); onChange() } catch (e) { toast((e as Error).message, 'err') } }} />
      )}
    </>
  )
}

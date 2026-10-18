import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Button, Field, Modal, useToast } from '../components/ui'

function Card({ title, desc, children, tone = '' }: { title: string; desc: string; children: ReactNode; tone?: string }) {
  return (
    <section className={`rounded-3xl bg-white p-6 shadow-card sm:p-7 ${tone}`}>
      <h2 className="text-xl">{title}</h2><p className="mb-5 mt-1 text-sm text-ink/60">{desc}</p>{children}
    </section>
  )
}

export default function Settings() {
  const { user, setUser } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [name, setName] = useState(user?.displayName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileErr, setProfileErr] = useState('')
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [confirm, setConfirm] = useState('')
  const [pwBusy, setPwBusy] = useState(false); const [pwErr, setPwErr] = useState('')
  const [delOpen, setDelOpen] = useState(false); const [delPw, setDelPw] = useState(''); const [delBusy, setDelBusy] = useState(false); const [delErr, setDelErr] = useState('')

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault(); setProfileBusy(true); setProfileErr('')
    try { setUser(await api.updateProfile(name, email)); toast('Profile saved') } catch (er) { setProfileErr((er as Error).message) } finally { setProfileBusy(false) }
  }
  const savePassword = async (e: FormEvent) => {
    e.preventDefault(); setPwErr('')
    if (next !== confirm) return setPwErr('The new passwords don’t match.')
    setPwBusy(true)
    try { await api.changePassword(cur, next); setCur(''); setNext(''); setConfirm(''); toast('Password changed. Other devices were signed out.') } catch (er) { setPwErr((er as Error).message) } finally { setPwBusy(false) }
  }
  const deleteAccount = async (e: FormEvent) => {
    e.preventDefault(); setDelBusy(true); setDelErr('')
    try { await api.deleteAccount(delPw); setUser(null); nav('/register', { replace: true }) } catch (er) { setDelErr((er as Error).message) } finally { setDelBusy(false) }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl sm:text-4xl">Settings</h1>
      <Card title="Profile" desc="How you appear in Study Vault and the email you sign in with.">
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {profileErr && <p role="alert" className="text-sm text-terracotta-deep">{profileErr}</p>}
          <Button type="submit" loading={profileBusy}>Save profile</Button>
        </form>
      </Card>
      <Card title="Password" desc="Changing your password signs you out everywhere else.">
        <form onSubmit={savePassword} className="space-y-4">
          <Field label="Current password" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
          <Field label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" hint="At least 8 characters." required />
          <Field label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          {pwErr && <p role="alert" className="text-sm text-terracotta-deep">{pwErr}</p>}
          <Button type="submit" loading={pwBusy}>Change password</Button>
        </form>
      </Card>
      <Card title="Delete account" desc="Permanently removes your account, every folder and file, and all assistant conversations." tone="ring-1 ring-terracotta/40">
        <Button variant="danger" onClick={() => setDelOpen(true)}>Delete my account…</Button>
      </Card>
      {delOpen && (
        <Modal title="Delete your account?" onClose={() => setDelOpen(false)}>
          <form onSubmit={deleteAccount} className="space-y-4">
            <p className="flex items-start gap-2.5 rounded-2xl bg-terracotta/15 p-3.5 text-sm text-terracotta-deep"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />This can’t be undone. All your files will be erased from the server.</p>
            <Field label="Enter your password to confirm" type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} autoFocus autoComplete="current-password" error={delErr} />
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setDelOpen(false)}>Cancel</Button><Button type="submit" variant="danger" loading={delBusy} disabled={!delPw}>Delete everything</Button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}

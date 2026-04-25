import { useState, useEffect } from 'react'
import { db } from '@/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import type { Member } from '@/types'

interface Props {
  open: boolean
  member?: Member | null
  onClose: () => void
}

export default function MemberForm({ open, member, onClose }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [idProof, setIdProof] = useState('')
  const [joinedOn, setJoinedOn] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (member) {
      setName(member.name)
      setPhone(member.phone ?? '')
      setEmail(member.email ?? '')
      setIdProof(member.idProof ?? '')
      setJoinedOn(member.joinedOn)
    } else {
      setName('')
      setPhone('')
      setEmail('')
      setIdProof('')
      setJoinedOn(format(new Date(), 'yyyy-MM-dd'))
    }
  }, [member, open])

  async function save() {
    if (!name.trim()) return toast.error('Name is required')

    setSaving(true)
    try {
      const data: Member = {
        id: member?.id ?? uuidv4(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        idProof: idProof.trim() || undefined,
        joinedOn,
      }
      if (member) {
        await db.members.put(data)
        toast.success('Member updated')
      } else {
        await db.members.add(data)
        toast.success('Member added')
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{member ? 'Edit Member' : 'Add Member'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" placeholder="Optional" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>ID Proof (Aadhaar / PAN ref)</Label>
            <Input placeholder="Optional" value={idProof} onChange={(e) => setIdProof(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Joined On *</Label>
            <Input type="date" value={joinedOn} onChange={(e) => setJoinedOn(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {member ? 'Update' : 'Add'} Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

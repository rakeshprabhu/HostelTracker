import { useState, useEffect } from 'react'
import { db } from '@/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

interface Props {
  open: boolean
  defaultRoomId?: string
  defaultMemberId?: string
  onClose: () => void
}

export default function TenancyForm({ open, defaultRoomId, defaultMemberId, onClose }: Props) {
  const [memberId, setMemberId] = useState(defaultMemberId ?? '')
  const [roomId, setRoomId] = useState(defaultRoomId ?? '')
  const [rent, setRent] = useState('')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)

  const members = useLiveQuery(() => db.members.orderBy('name').toArray(), [])
  const rooms = useLiveQuery(() => db.rooms.orderBy('number').toArray(), [])
  const activeTenancies = useLiveQuery(() => db.tenancies.filter((t) => !t.endDate).toArray(), [])

  // Members who don't already have an active tenancy
  const activeMemberIds = new Set(activeTenancies?.map((t) => t.memberId))
  const availableMembers = members?.filter(
    (m) => !activeMemberIds.has(m.id) || m.id === defaultMemberId,
  )

  // Rooms that aren't at capacity
  const occupancyMap = new Map<string, number>()
  activeTenancies?.forEach((t) => {
    occupancyMap.set(t.roomId, (occupancyMap.get(t.roomId) ?? 0) + 1)
  })
  const availableRooms = rooms?.filter((r) => {
    const occ = occupancyMap.get(r.id) ?? 0
    return occ < r.capacity || r.id === defaultRoomId
  })

  useEffect(() => {
    setMemberId(defaultMemberId ?? '')
    setRoomId(defaultRoomId ?? '')
    setStartDate(format(new Date(), 'yyyy-MM-dd'))
    setRent('')
  }, [open, defaultMemberId, defaultRoomId])

  async function save() {
    if (!memberId) return toast.error('Select a member')
    if (!roomId) return toast.error('Select a room')
    const rentAmt = parseFloat(rent)
    if (isNaN(rentAmt) || rentAmt < 0) return toast.error('Enter a valid rent amount')
    if (!startDate) return toast.error('Start date is required')

    // Check for existing active tenancy on the same member
    const existing = await db.tenancies.filter((t) => t.memberId === memberId && !t.endDate).first()
    if (existing) return toast.error('This member already has an active tenancy. End it first.')

    setSaving(true)
    try {
      await db.tenancies.add({
        id: uuidv4(),
        memberId,
        roomId,
        rentPerMonth: rentAmt,
        startDate,
      })
      toast.success('Tenancy created')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Member to Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Member *</Label>
            <Select value={memberId} onValueChange={setMemberId} disabled={!!defaultMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Room *</Label>
            <Select value={roomId} onValueChange={setRoomId} disabled={!!defaultRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {availableRooms?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Room {r.number} ({(occupancyMap.get(r.id) ?? 0)}/{r.capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Monthly Rent (₹) *</Label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 5000"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Start Date *</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

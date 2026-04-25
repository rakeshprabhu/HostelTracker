import { useState } from 'react'
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
import { format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import type { Tenancy } from '@/types'

interface Props {
  tenancy: Tenancy
  memberName: string
  onClose: () => void
}

export default function TransferRoomDialog({ tenancy, memberName, onClose }: Props) {
  const [newRoomId, setNewRoomId] = useState('')
  const [newRent, setNewRent] = useState(String(tenancy.rentPerMonth))
  const [transferDate, setTransferDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)

  const rooms = useLiveQuery(() => db.rooms.orderBy('number').toArray(), [])
  const activeTenancies = useLiveQuery(() => db.tenancies.filter((t) => !t.endDate).toArray(), [])

  const occupancyMap = new Map<string, number>()
  activeTenancies?.forEach((t) => {
    occupancyMap.set(t.roomId, (occupancyMap.get(t.roomId) ?? 0) + 1)
  })

  // Rooms other than current, not at capacity
  const availableRooms = rooms?.filter((r) => {
    if (r.id === tenancy.roomId) return false
    const occ = occupancyMap.get(r.id) ?? 0
    return occ < r.capacity
  })

  async function confirm() {
    if (!newRoomId) return toast.error('Select a new room')
    const rentAmt = parseFloat(newRent)
    if (isNaN(rentAmt) || rentAmt < 0) return toast.error('Enter a valid rent')
    if (transferDate < tenancy.startDate) return toast.error('Transfer date cannot be before tenancy start')

    setSaving(true)
    try {
      // End current tenancy on the day before transfer
      const endDate = transferDate
      await db.tenancies.update(tenancy.id, { endDate })

      // Start new tenancy from transfer date
      await db.tenancies.add({
        id: uuidv4(),
        memberId: tenancy.memberId,
        roomId: newRoomId,
        rentPerMonth: rentAmt,
        startDate: transferDate,
      })

      toast.success(`${memberName} transferred successfully`)
      onClose()
    } catch (e) {
      toast.error(`Error: ${String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Transfer Room — {memberName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Current room: <strong>
              {rooms?.find((r) => r.id === tenancy.roomId)?.number ?? tenancy.roomId}
            </strong>
          </p>
          <div className="space-y-1">
            <Label>Transfer Date *</Label>
            <Input
              type="date"
              value={transferDate}
              min={tenancy.startDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>New Room *</Label>
            <Select value={newRoomId} onValueChange={setNewRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="Select new room" />
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
            <Label>New Monthly Rent (₹) *</Label>
            <Input
              type="number"
              min="0"
              value={newRent}
              onChange={(e) => setNewRent(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm} disabled={saving}>Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

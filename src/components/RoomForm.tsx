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
import type { Room } from '@/types'

interface Props {
  open: boolean
  room?: Room | null
  onClose: () => void
}

export default function RoomForm({ open, room, onClose }: Props) {
  const [number, setNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [capacity, setCapacity] = useState('1')
  const [hasOwnMeter, setHasOwnMeter] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (room) {
      setNumber(room.number)
      setFloor(room.floor ?? '')
      setCapacity(String(room.capacity))
      setHasOwnMeter(room.hasOwnMeter)
      setNotes(room.notes ?? '')
    } else {
      setNumber('')
      setFloor('')
      setCapacity('1')
      setHasOwnMeter(false)
      setNotes('')
    }
  }, [room, open])

  async function save() {
    if (!number.trim()) return toast.error('Room number is required')
    const cap = parseInt(capacity)
    if (isNaN(cap) || cap < 1) return toast.error('Capacity must be at least 1')

    setSaving(true)
    try {
      const data: Room = {
        id: room?.id ?? uuidv4(),
        number: number.trim(),
        floor: floor.trim() || undefined,
        capacity: cap,
        hasOwnMeter,
        notes: notes.trim() || undefined,
      }
      if (room) {
        await db.rooms.put(data)
        toast.success('Room updated')
      } else {
        await db.rooms.add(data)
        toast.success('Room added')
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
          <DialogTitle>{room ? 'Edit Room' : 'Add Room'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Room Number *</Label>
            <Input placeholder="e.g. 101" value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Floor</Label>
            <Input placeholder="e.g. Ground, 1st" value={floor} onChange={(e) => setFloor(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Capacity (max occupants) *</Label>
            <Input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasMeter"
              checked={hasOwnMeter}
              onChange={(e) => setHasOwnMeter(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="hasMeter">Has own EB meter (per-room EB tracking)</Label>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {room ? 'Update' : 'Add'} Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

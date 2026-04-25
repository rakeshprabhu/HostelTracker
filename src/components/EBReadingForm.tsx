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
import type { EBReading } from '@/types'

interface Props {
  open: boolean
  reading?: EBReading | null
  defaultMonth: string
  onClose: () => void
}

export default function EBReadingForm({ open, reading, defaultMonth, onClose }: Props) {
  const [type, setType] = useState<'common' | 'room'>('common')
  const [roomId, setRoomId] = useState('')
  const [month, setMonth] = useState(defaultMonth)
  const [prevReading, setPrevReading] = useState('')
  const [currReading, setCurrReading] = useState('')
  const [rate, setRate] = useState('')
  const [saving, setSaving] = useState(false)

  const rooms = useLiveQuery(() => db.rooms.filter((r) => r.hasOwnMeter).toArray(), [])

  useEffect(() => {
    if (reading) {
      setType(reading.type)
      setRoomId(reading.roomId ?? '')
      setMonth(reading.month)
      setPrevReading(String(reading.previousReading))
      setCurrReading(String(reading.currentReading))
      setRate(String(reading.ratePerUnit))
    } else {
      setType('common')
      setRoomId('')
      setMonth(defaultMonth)
      setPrevReading('')
      setCurrReading('')
      setRate('')
    }
  }, [reading, open, defaultMonth])

  async function save() {
    const prev = parseFloat(prevReading)
    const curr = parseFloat(currReading)
    const rateVal = parseFloat(rate)

    if (isNaN(prev)) return toast.error('Previous reading is required')
    if (isNaN(curr)) return toast.error('Current reading is required')
    if (curr < prev) return toast.error('Current reading must be ≥ previous reading')
    if (isNaN(rateVal) || rateVal <= 0) return toast.error('Rate per unit is required')
    if (type === 'room' && !roomId) return toast.error('Select a room')

    setSaving(true)
    try {
      // Check for existing reading same month+type+room
      const existing = reading ?? await db.ebReadings
        .filter((r) =>
          r.month === month &&
          r.type === type &&
          (type === 'common' ? !r.roomId : r.roomId === roomId),
        )
        .first()

      const data: EBReading = {
        id: existing?.id ?? uuidv4(),
        month,
        type,
        roomId: type === 'room' ? roomId : undefined,
        previousReading: prev,
        currentReading: curr,
        ratePerUnit: rateVal,
      }

      if (existing) {
        await db.ebReadings.put(data)
        toast.success('Reading updated')
      } else {
        await db.ebReadings.add(data)
        toast.success('Reading added')
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
          <DialogTitle>{reading ? 'Edit' : 'Add'} EB Reading</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          {!reading && (
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'common' | 'room')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Common (whole building)</SelectItem>
                  <SelectItem value="room">Per Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {type === 'room' && (
            <div className="space-y-1">
              <Label>Room *</Label>
              <Select value={roomId} onValueChange={setRoomId} disabled={!!reading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>Room {r.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Previous Reading</Label>
              <Input
                type="number"
                min="0"
                placeholder="Units"
                value={prevReading}
                onChange={(e) => setPrevReading(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Current Reading</Label>
              <Input
                type="number"
                min="0"
                placeholder="Units"
                value={currReading}
                onChange={(e) => setCurrReading(e.target.value)}
              />
            </div>
          </div>
          {prevReading && currReading && !isNaN(parseFloat(prevReading)) && !isNaN(parseFloat(currReading)) && (
            <p className="text-xs text-muted-foreground">
              Units consumed: <strong>{(parseFloat(currReading) - parseFloat(prevReading)).toFixed(1)}</strong>
            </p>
          )}
          <div className="space-y-1">
            <Label>Rate per Unit (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 6.50"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {reading ? 'Update' : 'Add'} Reading
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

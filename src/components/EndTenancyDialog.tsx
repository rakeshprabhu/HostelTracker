import { useState } from 'react'
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
import { format } from 'date-fns'
import { calculateBill } from '@/lib/billing'
import { v4 as uuidv4 } from 'uuid'
import { useNavigate } from 'react-router-dom'
import type { Tenancy } from '@/types'

interface Props {
  tenancy: Tenancy
  memberName: string
  onClose: () => void
}

export default function EndTenancyDialog({ tenancy, memberName, onClose }: Props) {
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [generateBill, setGenerateBill] = useState(true)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  async function confirm() {
    if (!endDate) return toast.error('End date is required')
    if (endDate < tenancy.startDate) return toast.error('End date cannot be before start date')

    setSaving(true)
    try {
      await db.tenancies.update(tenancy.id, { endDate })

      if (generateBill) {
        const month = endDate.slice(0, 7)
        // Remove existing bill for this month if any
        const existing = await db.bills
          .filter((b) => b.memberId === tenancy.memberId && b.month === month)
          .first()
        if (existing) await db.bills.delete(existing.id)

        const bill = await calculateBill(tenancy.memberId, month)
        const newBill = await db.bills.add({ ...bill, id: uuidv4(), isPaid: false })
        toast.success('Tenancy ended and bill generated')
        onClose()
        navigate(`/bills/${newBill}`)
        return
      }

      toast.success(`${memberName} marked as vacated`)
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
          <DialogTitle>Mark {memberName} as Vacated</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Vacate Date *</Label>
            <Input
              type="date"
              value={endDate}
              min={tenancy.startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="genBill"
              checked={generateBill}
              onChange={(e) => setGenerateBill(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="genBill">Generate final bill for this month</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm} disabled={saving}>Confirm Vacate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

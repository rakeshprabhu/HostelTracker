import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Download, CheckCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { getOrCreateSettings } from '@/db'
import { generateBillPDF } from '@/lib/pdf'

export default function BillDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const bill = useLiveQuery(() => (id ? db.bills.get(id) : undefined), [id])
  const member = useLiveQuery(
    () => (bill ? db.members.get(bill.memberId) : undefined),
    [bill?.memberId],
  )

  async function togglePaid() {
    if (!bill) return
    const now = !bill.isPaid ? new Date().toISOString() : undefined
    await db.bills.update(bill.id, { isPaid: !bill.isPaid, paidAt: now })
    toast.success(bill.isPaid ? 'Marked as unpaid' : 'Marked as paid')
  }

  async function deleteBill() {
    if (!id) return
    await db.bills.delete(id)
    toast.success('Bill deleted')
    navigate('/bills')
  }

  async function downloadPDF() {
    if (!bill || !member) return
    const settings = await getOrCreateSettings()
    await generateBillPDF(bill, member, settings)
  }

  if (!bill || !member) return <div className="text-muted-foreground">Bill not found.</div>

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/bills')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{member.name}</h2>
          <p className="text-sm text-muted-foreground">
            {format(new Date(bill.month + '-01'), 'MMMM yyyy')}
          </p>
        </div>
        <Badge variant={bill.isPaid ? 'default' : 'destructive'} className="ml-auto">
          {bill.isPaid ? 'Paid' : 'Unpaid'}
        </Badge>
      </div>

      {/* Bill breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Bill Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {bill.lineItems.map((item, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between font-medium">
                <span>Room {item.roomNumber}</span>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(item.periodStart), 'dd MMM')} –{' '}
                  {format(parseISO(item.periodEnd), 'dd MMM')} ({item.daysStayed}/{item.daysInMonth} days)
                </span>
              </div>
              <div className="space-y-1 pl-3">
                <LineRow
                  label={`Rent (₹${item.rentPerMonth.toLocaleString('en-IN')}/mo × ${item.daysStayed} days)`}
                  value={item.roomRent}
                />
                {item.roomEBShare > 0 && (
                  <LineRow label="Room EB share" value={item.roomEBShare} />
                )}
              </div>
              {i < bill.lineItems.length - 1 && <Separator />}
            </div>
          ))}

          <Separator />
          <LineRow label="Common EB share" value={bill.commonEBShare} />
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>₹{bill.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
        </CardContent>
      </Card>

      {/* Meta */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>Generated: {format(parseISO(bill.generatedAt), 'dd MMM yyyy, HH:mm')}</p>
        {bill.isPaid && bill.paidAt && (
          <p>Paid on: {format(parseISO(bill.paidAt), 'dd MMM yyyy')}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={togglePaid} variant={bill.isPaid ? 'outline' : 'default'}>
          <CheckCircle className="h-4 w-4 mr-1" />
          {bill.isPaid ? 'Mark Unpaid' : 'Mark as Paid'}
        </Button>
        <Button variant="outline" onClick={downloadPDF}>
          <Download className="h-4 w-4 mr-1" /> Download PDF
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this bill?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. You can regenerate the bill from the Bills page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteBill}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function LineRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>₹{value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
    </div>
  )
}

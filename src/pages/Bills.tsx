import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Receipt, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { format, subMonths, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { calculateBill } from '@/lib/billing'
import { v4 as uuidv4 } from 'uuid'

export default function Bills() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [generating, setGenerating] = useState(false)

  const months = Array.from({ length: 12 }, (_, i) =>
    format(subMonths(new Date(), i), 'yyyy-MM'),
  )

  const bills = useLiveQuery(
    () => db.bills.where('month').equals(selectedMonth).toArray(),
    [selectedMonth],
  )

  const activeTenancies = useLiveQuery(
    () => db.tenancies.toArray(),
    [],
  )

  // Members active in selected month
  const membersInMonth = useLiveQuery(async () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const monthStart = new Date(y, m - 1, 1)
    const monthEnd = new Date(y, m, 0)

    const tenancies = await db.tenancies.toArray()
    const activeMemberIds = new Set(
      tenancies
        .filter((t) => {
          const start = parseISO(t.startDate)
          const end = t.endDate ? parseISO(t.endDate) : monthEnd
          return start <= monthEnd && end >= monthStart
        })
        .map((t) => t.memberId),
    )
    return db.members.where('id').anyOf([...activeMemberIds]).toArray()
  }, [selectedMonth, activeTenancies])

  const memberMap = useLiveQuery(async () => {
    const members = await db.members.toArray()
    return new Map(members.map((m) => [m.id, m]))
  }, [])

  const billedMemberIds = new Set(bills?.map((b) => b.memberId))
  const unbilledMembers = membersInMonth?.filter((m) => !billedMemberIds.has(m.id)) ?? []

  async function generateAll() {
    if (unbilledMembers.length === 0) return
    setGenerating(true)
    let success = 0
    for (const member of unbilledMembers) {
      try {
        const bill = await calculateBill(member.id, selectedMonth)
        await db.bills.add({ ...bill, id: uuidv4(), isPaid: false })
        success++
      } catch (e) {
        toast.error(`Failed to generate bill for ${member.name}`)
        console.error(e)
      }
    }
    setGenerating(false)
    if (success > 0) toast.success(`Generated ${success} bill${success > 1 ? 's' : ''}`)
  }

  async function generateForMember(memberId: string, name: string) {
    try {
      const bill = await calculateBill(memberId, selectedMonth)
      await db.bills.add({ ...bill, id: uuidv4(), isPaid: false })
      toast.success(`Bill generated for ${name}`)
    } catch (e) {
      toast.error(`Failed: ${String(e)}`)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Bills</h2>
        <div className="flex gap-2">
          {unbilledMembers.length > 0 && (
            <Button size="sm" onClick={generateAll} disabled={generating}>
              <RefreshCw className={`h-4 w-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
              Generate All ({unbilledMembers.length})
            </Button>
          )}
        </div>
      </div>

      {/* Month selector */}
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={m}>
              {format(new Date(m + '-01'), 'MMMM yyyy')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Unbilled members */}
      {unbilledMembers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Pending — No Bill Yet</h3>
          {unbilledMembers.map((m) => (
            <Card key={m.id} className="border-dashed">
              <CardContent className="p-3 flex items-center justify-between">
                <Link to={`/members/${m.id}`} className="text-sm font-medium hover:underline">
                  {m.name}
                </Link>
                <Button size="sm" variant="outline" onClick={() => generateForMember(m.id, m.name)}>
                  Generate Bill
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generated bills */}
      {(bills?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Generated Bills</h3>
          {bills?.map((bill) => {
            const member = memberMap?.get(bill.memberId)
            return (
              <Link key={bill.id} to={`/bills/${bill.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{member?.name ?? bill.memberId}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(bill.generatedAt), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        ₹{bill.total.toLocaleString('en-IN')}
                      </span>
                      <Badge variant={bill.isPaid ? 'default' : 'destructive'} className="text-xs">
                        {bill.isPaid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {bills?.length === 0 && unbilledMembers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-10 gap-2">
            <Receipt className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No active members found for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

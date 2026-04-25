import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, Receipt, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

export default function Dashboard() {
  const rooms = useLiveQuery(() => db.rooms.toArray(), [])
  const members = useLiveQuery(() => db.members.toArray(), [])
  const activeTenancies = useLiveQuery(
    () => db.tenancies.filter((t) => !t.endDate).toArray(),
    [],
  )
  const currentMonth = format(new Date(), 'yyyy-MM')
  const bills = useLiveQuery(
    () => db.bills.where('month').equals(currentMonth).toArray(),
    [currentMonth],
  )

  const unpaidBills = bills?.filter((b) => !b.isPaid) ?? []
  const paidBills = bills?.filter((b) => b.isPaid) ?? []

  const stats = [
    {
      title: 'Total Rooms',
      value: rooms?.length ?? 0,
      icon: Building2,
      sub: `${activeTenancies ? new Set(activeTenancies.map((t) => t.roomId)).size : 0} occupied`,
      href: '/rooms',
    },
    {
      title: 'Active Members',
      value: activeTenancies?.length ?? 0,
      icon: Users,
      sub: `${members?.length ?? 0} total registered`,
      href: '/members',
    },
    {
      title: 'Unpaid Bills',
      value: unpaidBills.length,
      icon: Receipt,
      sub: `${currentMonth} — ₹${unpaidBills.reduce((s, b) => s + b.total, 0).toLocaleString('en-IN')} due`,
      href: '/bills',
      alert: unpaidBills.length > 0,
    },
    {
      title: 'Paid This Month',
      value: paidBills.length,
      icon: CheckCircle,
      sub: `₹${paidBills.reduce((s, b) => s + b.total, 0).toLocaleString('en-IN')} collected`,
      href: '/bills',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground text-sm">{format(new Date(), 'MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} to={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.alert ? 'text-destructive' : ''}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent unpaid bills */}
      {unpaidBills.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Pending Bills — {currentMonth}
          </h3>
          <div className="space-y-2">
            {unpaidBills.slice(0, 5).map((bill) => (
              <UnpaidBillRow key={bill.id} billId={bill.id} total={bill.total} />
            ))}
            {unpaidBills.length > 5 && (
              <Link to="/bills" className="text-sm text-primary hover:underline block">
                View all {unpaidBills.length} unpaid bills →
              </Link>
            )}
          </div>
        </div>
      )}

      {activeTenancies?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm text-center">
              No active tenants yet.{' '}
              <Link to="/rooms" className="text-primary hover:underline">Add rooms</Link>
              {' '}and{' '}
              <Link to="/members" className="text-primary hover:underline">members</Link>
              {' '}to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function UnpaidBillRow({ billId, total }: { billId: string; total: number }) {
  const bill = useLiveQuery(() => db.bills.get(billId), [billId])
  const member = useLiveQuery(
    async () => bill ? db.members.get(bill.memberId) : undefined,
    [bill?.memberId],
  )

  if (!bill || !member) return null

  return (
    <Link to={`/bills/${bill.id}`}>
      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
        <div>
          <p className="font-medium text-sm">{member.name}</p>
          <p className="text-xs text-muted-foreground">{bill.month}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">₹{total.toLocaleString('en-IN')}</span>
          <Badge variant="destructive" className="text-xs">Unpaid</Badge>
        </div>
      </div>
    </Link>
  )
}

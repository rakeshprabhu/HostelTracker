import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { ArrowLeft, Pencil, Trash2, UserPlus, LogOut, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import MemberForm from '@/components/MemberForm'
import TenancyForm from '@/components/TenancyForm'
import EndTenancyDialog from '@/components/EndTenancyDialog'
import TransferRoomDialog from '@/components/TransferRoomDialog'
import type { Tenancy, Bill } from '@/types'

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [endTenancy, setEndTenancy] = useState<Tenancy | null>(null)
  const [transferTenancy, setTransferTenancy] = useState<Tenancy | null>(null)

  const member = useLiveQuery(() => (id ? db.members.get(id) : undefined), [id])
  const tenancies = useLiveQuery(
    () => (id ? db.tenancies.where('memberId').equals(id).sortBy('startDate') : Promise.resolve([] as Tenancy[])),
    [id],
  )
  const bills = useLiveQuery(
    () => (id ? db.bills.where('memberId').equals(id).sortBy('month') : Promise.resolve([] as Bill[])),
    [id],
  )
  const rooms = useLiveQuery(() => db.rooms.toArray(), [])
  const roomMap = new Map(rooms?.map((r) => [r.id, r]))

  const activeTenancy = tenancies?.find((t) => !t.endDate)

  async function deleteMember() {
    if (!id) return
    const active = await db.tenancies.filter((t) => t.memberId === id && !t.endDate).count()
    if (active > 0) {
      toast.error('End the active tenancy before deleting this member')
      return
    }
    await db.members.delete(id)
    toast.success('Member deleted')
    navigate('/members')
  }

  if (!member) return <div className="text-muted-foreground">Member not found.</div>

  const currentRoom = activeTenancy ? roomMap.get(activeTenancy.roomId) : undefined

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/members')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">{member.name}</h2>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {member.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. All tenancy and bill history will remain.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteMember}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Member Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Name" value={member.name} />
          {member.phone && <Row label="Phone" value={member.phone} />}
          {member.email && <Row label="Email" value={member.email} />}
          {member.idProof && <Row label="ID Proof" value={member.idProof} />}
          <Row
            label="Joined On"
            value={format(parseISO(member.joinedOn), 'dd MMM yyyy')}
          />
          <Row
            label="Current Room"
            value={
              currentRoom ? (
                <Link to={`/rooms/${currentRoom.id}`} className="text-primary hover:underline">
                  Room {currentRoom.number}
                </Link>
              ) : (
                <span className="text-muted-foreground">Not assigned</span>
              )
            }
          />
          {activeTenancy && (
            <Row
              label="Current Rent"
              value={`₹${activeTenancy.rentPerMonth.toLocaleString('en-IN')}/month`}
            />
          )}
        </CardContent>
      </Card>

      {/* Actions for active tenancy */}
      {activeTenancy ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setTransferTenancy(activeTenancy)}>
            <ArrowRightLeft className="h-4 w-4 mr-1" /> Transfer Room
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEndTenancy(activeTenancy)}>
            <LogOut className="h-4 w-4 mr-1" /> Mark Vacated
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={() => setShowAssign(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Assign to Room
        </Button>
      )}

      {/* Tenancy history */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Tenancy History</h3>
        {tenancies?.length === 0 && (
          <p className="text-muted-foreground text-sm">No tenancies yet.</p>
        )}
        {[...(tenancies ?? [])].reverse().map((t) => {
          const room = roomMap.get(t.roomId)
          return (
            <Card key={t.id} className={t.endDate ? 'opacity-70' : ''}>
              <CardContent className="p-3 flex items-center justify-between text-sm">
                <div>
                  <Link to={`/rooms/${t.roomId}`} className="font-medium hover:underline">
                    Room {room?.number ?? t.roomId}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(t.startDate), 'dd MMM yyyy')}
                    {' – '}
                    {t.endDate ? format(parseISO(t.endDate), 'dd MMM yyyy') : 'Present'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{t.rentPerMonth.toLocaleString('en-IN')}/mo</p>
                  {!t.endDate ? (
                    <Badge className="text-xs">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Ended</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Bills */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Bills</h3>
        {bills?.length === 0 && (
          <p className="text-muted-foreground text-sm">No bills generated yet.</p>
        )}
        {[...(bills ?? [])].reverse().map((bill) => (
          <Link key={bill.id} to={`/bills/${bill.id}`}>
            <Card className="hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{bill.month}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(bill.generatedAt), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">₹{bill.total.toLocaleString('en-IN')}</span>
                  <Badge variant={bill.isPaid ? 'default' : 'destructive'} className="text-xs">
                    {bill.isPaid ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <MemberForm open={showEdit} member={member} onClose={() => setShowEdit(false)} />
      <TenancyForm
        open={showAssign}
        defaultMemberId={id}
        onClose={() => setShowAssign(false)}
      />
      {endTenancy && (
        <EndTenancyDialog
          tenancy={endTenancy}
          memberName={member.name}
          onClose={() => setEndTenancy(null)}
        />
      )}
      {transferTenancy && (
        <TransferRoomDialog
          tenancy={transferTenancy}
          memberName={member.name}
          onClose={() => setTransferTenancy(null)}
        />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

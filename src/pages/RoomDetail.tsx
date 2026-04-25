import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
import { ArrowLeft, Pencil, Trash2, UserPlus, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import RoomForm from '@/components/RoomForm'
import TenancyForm from '@/components/TenancyForm'
import type { Tenancy } from '@/types'

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const [showAssign, setShowAssign] = useState(false)

  const room = useLiveQuery(() => (id ? db.rooms.get(id) : undefined), [id])
  const tenancies = useLiveQuery(
    () => (id ? db.tenancies.where('roomId').equals(id).sortBy('startDate') : Promise.resolve([] as Tenancy[])),
    [id],
  )
  const activeTenancies = tenancies?.filter((t) => !t.endDate) ?? []

  const memberIds = [...new Set(tenancies?.map((t) => t.memberId) ?? [])]
  const members = useLiveQuery(
    () => db.members.where('id').anyOf(memberIds).toArray(),
    [memberIds.join(',')],
  )
  const memberMap = new Map(members?.map((m) => [m.id, m]))

  async function deleteRoom() {
    if (!id) return
    const active = await db.tenancies.filter((t) => t.roomId === id && !t.endDate).count()
    if (active > 0) {
      toast.error('Cannot delete room with active tenants')
      return
    }
    await db.rooms.delete(id)
    toast.success('Room deleted')
    navigate('/rooms')
  }

  if (!room) return <div className="text-muted-foreground">Room not found.</div>

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/rooms')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">Room {room.number}</h2>
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
                <AlertDialogTitle>Delete Room {room.number}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. All tenancy history for this room will remain.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteRoom}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Room Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Number" value={room.number} />
          {room.floor && <Row label="Floor" value={room.floor} />}
          <Row label="Capacity" value={`${room.capacity} ${room.capacity === 1 ? 'person' : 'people'}`} />
          <Row
            label="EB Meter"
            value={
              room.hasOwnMeter ? (
                <Badge variant="secondary"><Zap className="h-3 w-3 mr-1" />Own meter</Badge>
              ) : (
                <span className="text-muted-foreground">Common only</span>
              )
            }
          />
          <Row
            label="Occupancy"
            value={
              <Badge variant={activeTenancies.length >= room.capacity ? 'destructive' : 'outline'}>
                {activeTenancies.length}/{room.capacity} occupied
              </Badge>
            }
          />
          {room.notes && <Row label="Notes" value={room.notes} />}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tenancy History</h3>
        {activeTenancies.length < room.capacity && (
          <Button size="sm" onClick={() => setShowAssign(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Assign Member
          </Button>
        )}
      </div>

      {tenancies?.length === 0 && (
        <p className="text-muted-foreground text-sm">No tenancy history yet.</p>
      )}

      <div className="space-y-2">
        {[...(tenancies ?? [])].reverse().map((t) => {
          const member = memberMap.get(t.memberId)
          return (
            <Card key={t.id} className={t.endDate ? 'opacity-70' : ''}>
              <CardContent className="p-3 flex items-center justify-between text-sm">
                <div>
                  <Link to={`/members/${t.memberId}`} className="font-medium hover:underline">
                    {member?.name ?? t.memberId}
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

      <Separator />

      <RoomForm open={showEdit} room={room} onClose={() => setShowEdit(false)} />
      <TenancyForm
        open={showAssign}
        defaultRoomId={room.id}
        onClose={() => setShowAssign(false)}
      />
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

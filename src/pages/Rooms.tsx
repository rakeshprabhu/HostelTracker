import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Zap, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import RoomForm from '@/components/RoomForm'
import type { Room } from '@/types'

export default function Rooms() {
  const rooms = useLiveQuery(() => db.rooms.orderBy('number').toArray(), [])
  const tenancies = useLiveQuery(() => db.tenancies.filter((t) => !t.endDate).toArray(), [])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)

  const occupancyMap = new Map<string, number>()
  tenancies?.forEach((t) => {
    occupancyMap.set(t.roomId, (occupancyMap.get(t.roomId) ?? 0) + 1)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Rooms</h2>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Add Room
        </Button>
      </div>

      {rooms?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No rooms yet. Add your first room.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms?.map((room) => {
          const occupied = occupancyMap.get(room.id) ?? 0
          const isFull = occupied >= room.capacity
          return (
            <Link key={room.id} to={`/rooms/${room.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-base">Room {room.number}</p>
                      {room.floor && (
                        <p className="text-xs text-muted-foreground">{room.floor}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {room.hasOwnMeter && (
                        <Badge variant="secondary" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />EB
                        </Badge>
                      )}
                      <Badge variant={isFull ? 'destructive' : occupied > 0 ? 'default' : 'outline'} className="text-xs">
                        {occupied}/{room.capacity}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm text-muted-foreground">
                      Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'people'}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <RoomForm
        open={showForm}
        room={editing}
        onClose={() => { setShowForm(false); setEditing(null) }}
      />
    </div>
  )
}

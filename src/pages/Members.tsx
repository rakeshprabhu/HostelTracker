import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Users, Search, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import MemberForm from '@/components/MemberForm'

export default function Members() {
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const members = useLiveQuery(() => db.members.orderBy('name').toArray(), [])
  const activeTenancies = useLiveQuery(
    () => db.tenancies.filter((t) => !t.endDate).toArray(),
    [],
  )
  const rooms = useLiveQuery(() => db.rooms.toArray(), [])

  const activeMemberIds = new Set(activeTenancies?.map((t) => t.memberId))
  const tenancyByMember = new Map(activeTenancies?.map((t) => [t.memberId, t]))
  const roomMap = new Map(rooms?.map((r) => [r.id, r]))

  const filtered = members?.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Members</h2>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Member
        </Button>
      </div>

      {(members?.length ?? 0) > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {members?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No members yet. Add your first member.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered?.map((member) => {
          const tenancy = tenancyByMember.get(member.id)
          const room = tenancy ? roomMap.get(tenancy.roomId) : undefined
          const isActive = activeMemberIds.has(member.id)
          return (
            <Link key={member.id} to={`/members/${member.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {room ? `Room ${room.number}` : 'No room assigned'}
                      {member.phone && ` · ${member.phone}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <Badge className="text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
        {filtered?.length === 0 && search && (
          <p className="text-muted-foreground text-sm text-center py-4">
            No members match &quot;{search}&quot;
          </p>
        )}
      </div>

      <MemberForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}

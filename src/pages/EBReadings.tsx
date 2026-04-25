import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Zap, Building2 } from 'lucide-react'
import { useState } from 'react'
import { format, subMonths } from 'date-fns'
import EBReadingForm from '@/components/EBReadingForm'
import type { EBReading } from '@/types'

export default function EBReadings() {
  const [showForm, setShowForm] = useState(false)
  const [editReading, setEditReading] = useState<EBReading | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  const readings = useLiveQuery(
    () => db.ebReadings.where('month').equals(selectedMonth).toArray(),
    [selectedMonth],
  )
  const rooms = useLiveQuery(
    () => db.rooms.filter((r) => r.hasOwnMeter).toArray(),
    [],
  )
  const commonReading = readings?.find((r) => r.type === 'common')
  const roomReadings = readings?.filter((r) => r.type === 'room') ?? []

  const months = Array.from({ length: 6 }, (_, i) =>
    format(subMonths(new Date(), i), 'yyyy-MM'),
  )

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">EB Readings</h2>
        <Button size="sm" onClick={() => { setEditReading(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Add Reading
        </Button>
      </div>

      {/* Month selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {months.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              m === selectedMonth
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-accent'
            }`}
          >
            {format(new Date(m + '-01'), 'MMM yyyy')}
          </button>
        ))}
      </div>

      {/* Common EB */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Zap className="h-3 w-3" /> Common EB
        </h3>
        {commonReading ? (
          <Card
            className="cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => { setEditReading(commonReading); setShowForm(true) }}
          >
            <CardContent className="p-4">
              <ReadingDetails reading={commonReading} />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                No common EB reading for {selectedMonth}
              </p>
              <Button size="sm" variant="outline" onClick={() => { setEditReading(null); setShowForm(true) }}>
                <Plus className="h-4 w-4 mr-1" /> Add Common Reading
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Per-room EB */}
      {(rooms?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Building2 className="h-3 w-3" /> Per-Room EB
          </h3>
          {rooms?.map((room) => {
            const reading = roomReadings.find((r) => r.roomId === room.id)
            return (
              <Card
                key={room.id}
                className={`${reading ? 'cursor-pointer hover:shadow-sm transition-shadow' : 'border-dashed'}`}
                onClick={reading ? () => { setEditReading(reading); setShowForm(true) } : undefined}
              >
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-sm">Room {room.number}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  {reading ? (
                    <ReadingDetails reading={reading} />
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">No reading yet</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditReading(null)
                          setShowForm(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {rooms?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No rooms with own EB meters. Enable &quot;has own meter&quot; on a room to track per-room EB.
        </p>
      )}

      <EBReadingForm
        open={showForm}
        reading={editReading}
        defaultMonth={selectedMonth}
        onClose={() => { setShowForm(false); setEditReading(null) }}
      />
    </div>
  )
}

function ReadingDetails({ reading }: { reading: EBReading }) {
  const units = reading.currentReading - reading.previousReading
  const amount = units * reading.ratePerUnit
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
      <span className="text-muted-foreground">Previous</span>
      <span>{reading.previousReading} units</span>
      <span className="text-muted-foreground">Current</span>
      <span>{reading.currentReading} units</span>
      <span className="text-muted-foreground">Consumed</span>
      <span className="font-medium">{units} units</span>
      <span className="text-muted-foreground">Rate</span>
      <span>₹{reading.ratePerUnit}/unit</span>
      <span className="text-muted-foreground font-medium">Total</span>
      <span className="font-semibold text-primary">₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
    </div>
  )
}

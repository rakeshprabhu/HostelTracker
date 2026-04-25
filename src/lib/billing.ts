import {
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  parseISO,
  min,
  max,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  isEqual,
} from 'date-fns'
import type { Tenancy, BillLineItem, Bill, Room } from '@/types'
import { db } from '@/db'

export function getOverlapDays(
  startDate: string,
  endDate: string | undefined,
  monthStart: Date,
  monthEnd: Date,
): number {
  const start = parseISO(startDate)
  const end = endDate ? parseISO(endDate) : monthEnd

  const overlapStart = max([start, monthStart])
  const overlapEnd = min([end, monthEnd])

  if (isAfter(overlapStart, overlapEnd)) return 0
  if (isEqual(overlapStart, overlapEnd)) return 1
  return differenceInCalendarDays(overlapEnd, overlapStart) + 1
}

export function dateInMonth(date: Date, monthStart: Date, monthEnd: Date): boolean {
  return !isBefore(date, monthStart) && !isAfter(date, monthEnd)
}

export async function calculateBill(
  memberId: string,
  month: string,
): Promise<Omit<Bill, 'id' | 'isPaid' | 'paidAt' | 'notes'>> {
  const [year, mon] = month.split('-').map(Number)
  const monthStart = startOfMonth(new Date(year, mon - 1))
  const monthEnd = endOfMonth(new Date(year, mon - 1))
  const daysInMonth = getDaysInMonth(monthStart)

  // All tenancies in this month for this member
  const memberTenancies = await db.tenancies
    .where('memberId')
    .equals(memberId)
    .toArray()

  const activeTenancies = memberTenancies.filter((t) => {
    const days = getOverlapDays(t.startDate, t.endDate, monthStart, monthEnd)
    return days > 0
  })

  // All tenancies across all members active this month (for common EB)
  const allTenancies = await db.tenancies.toArray()
  const allActive = allTenancies.filter((t) => {
    const days = getOverlapDays(t.startDate, t.endDate, monthStart, monthEnd)
    return days > 0
  })

  const totalPersonDays = allActive.reduce(
    (sum, t) => sum + getOverlapDays(t.startDate, t.endDate, monthStart, monthEnd),
    0,
  )

  const memberTotalDays = activeTenancies.reduce(
    (sum, t) => sum + getOverlapDays(t.startDate, t.endDate, monthStart, monthEnd),
    0,
  )

  // Common EB
  const commonReading = await db.ebReadings
    .where('[month+type]')
    .equals([month, 'common'])
    .first()
    .catch(() =>
      db.ebReadings
        .filter((r) => r.month === month && r.type === 'common')
        .first(),
    )

  let commonEBShare = 0
  if (commonReading && totalPersonDays > 0) {
    const units = commonReading.currentReading - commonReading.previousReading
    const total = units * commonReading.ratePerUnit
    commonEBShare = (memberTotalDays / totalPersonDays) * total
  }

  // Line items per tenancy
  const rooms = await db.rooms.toArray()
  const roomMap = new Map(rooms.map((r) => [r.id, r]))

  const lineItems: BillLineItem[] = []

  for (const tenancy of activeTenancies) {
    const days = getOverlapDays(tenancy.startDate, tenancy.endDate, monthStart, monthEnd)
    const room = roomMap.get(tenancy.roomId)
    const roomNumber = room?.number ?? tenancy.roomId

    const roomRent = (tenancy.rentPerMonth / daysInMonth) * days

    // Room EB share
    let roomEBShare = 0
    if (room?.hasOwnMeter) {
      const roomReading = await db.ebReadings
        .filter((r) => r.month === month && r.type === 'room' && r.roomId === tenancy.roomId)
        .first()

      if (roomReading) {
        const roomPersonDays = allActive
          .filter((t) => t.roomId === tenancy.roomId)
          .reduce(
            (sum, t) => sum + getOverlapDays(t.startDate, t.endDate, monthStart, monthEnd),
            0,
          )
        if (roomPersonDays > 0) {
          const units = roomReading.currentReading - roomReading.previousReading
          const total = units * roomReading.ratePerUnit
          roomEBShare = (days / roomPersonDays) * total
        }
      }
    }

    const periodStart = formatDate(max([parseISO(tenancy.startDate), monthStart]))
    const periodEnd = formatDate(min([tenancy.endDate ? parseISO(tenancy.endDate) : monthEnd, monthEnd]))

    lineItems.push({
      tenancyId: tenancy.id,
      roomId: tenancy.roomId,
      roomNumber,
      periodStart,
      periodEnd,
      daysStayed: days,
      daysInMonth,
      rentPerMonth: tenancy.rentPerMonth,
      roomRent: round2(roomRent),
      roomEBShare: round2(roomEBShare),
    })
  }

  const total = round2(
    lineItems.reduce((s, l) => s + l.roomRent + l.roomEBShare, 0) + commonEBShare,
  )

  return {
    memberId,
    month,
    generatedAt: new Date().toISOString(),
    lineItems,
    commonEBShare: round2(commonEBShare),
    total,
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export async function getActiveTenancyForMember(memberId: string): Promise<Tenancy | undefined> {
  return db.tenancies
    .filter((t) => t.memberId === memberId && !t.endDate)
    .first()
}

export async function getRoomCurrentOccupants(roomId: string): Promise<string[]> {
  const tenancies = await db.tenancies
    .filter((t) => t.roomId === roomId && !t.endDate)
    .toArray()
  return tenancies.map((t) => t.memberId)
}

export async function getActiveRoomsForMonth(
  month: string,
): Promise<Map<string, Room>> {
  const [year, mon] = month.split('-').map(Number)
  const monthStart = startOfMonth(new Date(year, mon - 1))
  const monthEnd = endOfMonth(new Date(year, mon - 1))

  const tenancies = await db.tenancies.toArray()
  const activeRoomIds = new Set(
    tenancies
      .filter((t) => getOverlapDays(t.startDate, t.endDate, monthStart, monthEnd) > 0)
      .map((t) => t.roomId),
  )

  const rooms = await db.rooms.toArray()
  return new Map(rooms.filter((r) => activeRoomIds.has(r.id)).map((r) => [r.id, r]))
}

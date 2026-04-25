import Dexie, { type EntityTable } from 'dexie'
import type { Room, Member, Tenancy, EBReading, Bill, Settings } from '@/types'

class HostelDB extends Dexie {
  rooms!: EntityTable<Room, 'id'>
  members!: EntityTable<Member, 'id'>
  tenancies!: EntityTable<Tenancy, 'id'>
  ebReadings!: EntityTable<EBReading, 'id'>
  bills!: EntityTable<Bill, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('HostelTrackerDB')
    this.version(1).stores({
      rooms: 'id, number',
      members: 'id, name',
      tenancies: 'id, memberId, roomId, startDate, endDate',
      ebReadings: 'id, month, type, roomId',
      bills: 'id, memberId, month, isPaid',
      settings: 'id',
    })
  }
}

export const db = new HostelDB()

export async function getOrCreateSettings(): Promise<Settings> {
  let s = await db.settings.get('default')
  if (!s) {
    s = { id: 'default', hostelName: 'My Hostel' }
    await db.settings.add(s)
  }
  return s
}

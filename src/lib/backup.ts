import { db } from '@/db'
import { format } from 'date-fns'

interface BackupData {
  version: number
  exportedAt: string
  rooms: unknown[]
  members: unknown[]
  tenancies: unknown[]
  ebReadings: unknown[]
  bills: unknown[]
  settings: unknown[]
}

export async function exportAllData(): Promise<void> {
  const [rooms, members, tenancies, ebReadings, bills, settings] = await Promise.all([
    db.rooms.toArray(),
    db.members.toArray(),
    db.tenancies.toArray(),
    db.ebReadings.toArray(),
    db.bills.toArray(),
    db.settings.toArray(),
  ])

  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    rooms,
    members,
    tenancies,
    ebReadings,
    bills,
    settings,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hostel-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
  a.click()
  URL.revokeObjectURL(url)

  // Update last exported timestamp
  await db.settings.update('default', { lastExportedAt: new Date().toISOString() })
}

export async function importAllData(file: File): Promise<void> {
  const text = await file.text()
  const data: BackupData = JSON.parse(text)

  if (data.version !== 1) {
    throw new Error(`Unsupported backup version: ${data.version}`)
  }

  await db.transaction('rw', [db.rooms, db.members, db.tenancies, db.ebReadings, db.bills, db.settings], async () => {
    await db.rooms.clear()
    await db.members.clear()
    await db.tenancies.clear()
    await db.ebReadings.clear()
    await db.bills.clear()
    await db.settings.clear()

    if (data.rooms?.length) await db.rooms.bulkAdd(data.rooms as never[])
    if (data.members?.length) await db.members.bulkAdd(data.members as never[])
    if (data.tenancies?.length) await db.tenancies.bulkAdd(data.tenancies as never[])
    if (data.ebReadings?.length) await db.ebReadings.bulkAdd(data.ebReadings as never[])
    if (data.bills?.length) await db.bills.bulkAdd(data.bills as never[])
    if (data.settings?.length) await db.settings.bulkAdd(data.settings as never[])
  })
}

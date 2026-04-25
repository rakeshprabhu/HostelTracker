export interface Room {
  id: string
  number: string
  floor?: string
  capacity: number
  hasOwnMeter: boolean
  notes?: string
}

export interface Member {
  id: string
  name: string
  phone?: string
  email?: string
  idProof?: string
  joinedOn: string
}

export interface Tenancy {
  id: string
  memberId: string
  roomId: string
  rentPerMonth: number
  startDate: string
  endDate?: string
}

export interface EBReading {
  id: string
  month: string
  type: 'common' | 'room'
  roomId?: string
  previousReading: number
  currentReading: number
  ratePerUnit: number
}

export interface BillLineItem {
  tenancyId: string
  roomId: string
  roomNumber: string
  periodStart: string
  periodEnd: string
  daysStayed: number
  daysInMonth: number
  rentPerMonth: number
  roomRent: number
  roomEBShare: number
}

export interface Bill {
  id: string
  memberId: string
  month: string
  generatedAt: string
  lineItems: BillLineItem[]
  commonEBShare: number
  total: number
  isPaid: boolean
  paidAt?: string
  notes?: string
}

export interface Settings {
  id: string
  hostelName: string
  address?: string
  phone?: string
  lastExportedAt?: string
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db, getOrCreateSettings } from '@/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useRef, useState, useEffect } from 'react'
import { exportAllData, importAllData } from '@/lib/backup'
import { format, parseISO } from 'date-fns'

export default function Settings() {
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const [hostelName, setHostelName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (settings) {
      setHostelName(settings.hostelName)
      setAddress(settings.address ?? '')
      setPhone(settings.phone ?? '')
    }
  }, [settings])

  async function saveSettings() {
    await db.settings.update('default', { hostelName, address, phone })
    toast.success('Settings saved')
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importAllData(file)
      toast.success('Data imported successfully')
    } catch (err) {
      toast.error(`Import failed: ${String(err)}`)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-bold">Settings</h2>

      {/* Hostel info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hostel Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Hostel Name</Label>
            <Input value={hostelName} onChange={(e) => setHostelName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input
              placeholder="Optional"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Contact Phone</Label>
            <Input
              placeholder="Optional"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Button onClick={saveSettings}>Save</Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Backup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export all data as a JSON file for safekeeping. Import to restore on a new device.
          </p>

          {settings?.lastExportedAt && (
            <p className="text-xs text-muted-foreground">
              Last exported: {format(parseISO(settings.lastExportedAt), 'dd MMM yyyy, HH:mm')}
            </p>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await exportAllData()
                  toast.success('Backup downloaded')
                } catch (e) {
                  toast.error(`Export failed: ${String(e)}`)
                }
              }}
            >
              <Download className="h-4 w-4 mr-1" /> Export Backup
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-1" /> Import Backup
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Replace all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Importing will <strong>permanently replace</strong> all current rooms, members,
                    tenancies, EB readings, and bills with the backup file contents. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => fileRef.current?.click()}>
                    Choose File &amp; Import
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

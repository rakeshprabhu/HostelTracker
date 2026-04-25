import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Dashboard from '@/pages/Dashboard'
import Rooms from '@/pages/Rooms'
import RoomDetail from '@/pages/RoomDetail'
import Members from '@/pages/Members'
import MemberDetail from '@/pages/MemberDetail'
import Tenancies from '@/pages/Tenancies'
import EBReadings from '@/pages/EBReadings'
import Bills from '@/pages/Bills'
import BillDetail from '@/pages/BillDetail'
import SettingsPage from '@/pages/Settings'
import {
  Home,
  Building2,
  Users,
  Zap,
  Receipt,
  Settings as SettingsIcon,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home, exact: true },
  { to: '/rooms', label: 'Rooms', icon: Building2 },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/eb-readings', label: 'EB Readings', icon: Zap },
  { to: '/bills', label: 'Bills', icon: Receipt },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
  onClick,
}: (typeof navItems)[0] & { onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent',
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  )
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full p-4 gap-1">
      <div className="px-3 py-2 mb-4">
        <h1 className="font-semibold text-lg">Hostel Tracker</h1>
        <p className="text-xs text-muted-foreground">Billing management</p>
      </div>
      {navItems.map((item) => (
        <NavItem key={item.to} {...item} onClick={onClose} />
      ))}
    </div>
  )
}

function PageTitle() {
  const loc = useLocation()
  const match = navItems.find((n) =>
    n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to),
  )
  return <span className="font-semibold">{match?.label ?? 'Hostel Tracker'}</span>
}

function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex w-56 border-r flex-col shrink-0">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-background border-r z-50">
            <div className="flex justify-end p-2">
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b">
          <button onClick={() => setMobileOpen(true)} className="p-1 rounded-lg hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>
          <PageTitle />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/rooms/:id" element={<RoomDetail />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/tenancies/*" element={<Tenancies />} />
            <Route path="/eb-readings" element={<EBReadings />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/bills/:id" element={<BillDetail />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Layout />
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

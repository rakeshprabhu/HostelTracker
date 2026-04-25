import { Navigate } from 'react-router-dom'

// Tenancy actions are handled inline from Member and Room detail pages.
// This route redirects to members.
export default function Tenancies() {
  return <Navigate to="/members" replace />
}

import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children, soloStaff = false, soloHuesped = false }) {
  const location = useLocation()
  const { isAuthenticated, usuario, abrirModalAuth } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      abrirModalAuth('login')
    }
  }, [abrirModalAuth, isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  const esStaff = usuario?.es_staff === true

  if (soloStaff && !esStaff) {
    return <Navigate to="/dashboard/mis-reservaciones" replace />
  }

  if (soloHuesped && esStaff) {
    return <Navigate to="/dashboard/reservaciones" replace />
  }

  return children
}

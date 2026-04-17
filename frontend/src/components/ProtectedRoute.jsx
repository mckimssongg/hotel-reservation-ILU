import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated, abrirModalAuth } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      abrirModalAuth('login')
    }
  }, [abrirModalAuth, isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return children
}

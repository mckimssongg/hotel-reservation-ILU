import { Navigate, Route, Routes } from 'react-router-dom'

import AuthModal from './components/AuthModal'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import CalendarioRecepcionPage from './pages/CalendarioRecepcionPage'
import DashboardPage from './pages/DashboardPage'
import DashboardEstadisticasPage from './pages/DashboardEstadisticasPage'
import ListaEsperaPage from './pages/ListaEsperaPage'
import MisReservasPage from './pages/MisReservasPage'
import RecepcionReservasPage from './pages/RecepcionReservasPage'
import PublicHomePage from './pages/PublicHomePage'

function DashboardIndexRedirect() {
  const { usuario } = useAuth()
  if (usuario?.es_staff) {
    return <Navigate to="reservaciones" replace />
  }
  return <Navigate to="mis-reservaciones" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<PublicHomePage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardIndexRedirect />} />
          <Route 
            path="mis-reservaciones" 
            element={
              <ProtectedRoute soloHuesped>
                <MisReservasPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="reservaciones" 
            element={
              <ProtectedRoute soloStaff>
                <RecepcionReservasPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="calendario" 
            element={
              <ProtectedRoute soloStaff>
                <CalendarioRecepcionPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="estadisticas" 
            element={
              <ProtectedRoute soloStaff>
                <DashboardEstadisticasPage />
              </ProtectedRoute>
            } 
          />
          <Route path="lista-espera" element={<ListaEsperaPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AuthModal />
    </AuthProvider>
  )
}

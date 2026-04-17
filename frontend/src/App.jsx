import { Navigate, Route, Routes } from 'react-router-dom'

import AuthModal from './components/AuthModal'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import CalendarioRecepcionPage from './pages/CalendarioRecepcionPage'
import DashboardPage from './pages/DashboardPage'
import ListaEsperaPage from './pages/ListaEsperaPage'
import MisReservasPage from './pages/MisReservasPage'
import PublicHomePage from './pages/PublicHomePage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<PublicHomePage />} />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          )}
        >
          <Route index element={<Navigate to="mis-reservaciones" replace />} />
          <Route path="mis-reservaciones" element={<MisReservasPage />} />
          <Route path="calendario" element={<CalendarioRecepcionPage />} />
          <Route path="lista-espera" element={<ListaEsperaPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AuthModal />
    </AuthProvider>
  )
}

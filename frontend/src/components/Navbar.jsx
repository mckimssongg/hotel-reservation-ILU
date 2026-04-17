import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export default function Navbar({ onMenuClick = null, mostrarMenuMovil = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, usuario, abrirModalAuth, cerrarSesion } = useAuth()

  const nombreMostrado = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim() || usuario?.usuario || 'Usuario'
  const estaEnDashboard = location.pathname.startsWith('/dashboard')

  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm sticky-top">
      <div className="container py-1">
        <div className="d-flex align-items-center gap-2">
          {mostrarMenuMovil ? (
            <button type="button" className="btn btn-outline-secondary d-md-none" onClick={onMenuClick} aria-label="Abrir menu">
              <i className="bi bi-list" />
            </button>
          ) : null}

          <button type="button" className="btn btn-link text-decoration-none p-0 d-flex align-items-center gap-2" onClick={() => navigate('/')}>
            <span className="rounded-3 d-inline-flex align-items-center justify-content-center" style={{ width: 36, height: 36, backgroundColor: 'var(--hotel-color-primario)' }}>
              <i className="bi bi-buildings text-white" />
            </span>
            <span className="fw-semibold text-dark">Hotel Gatas</span>
          </button>
        </div>

        <div className="ms-auto d-flex align-items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="small text-secondary d-none d-md-inline">{nombreMostrado}</span>

              <div className="btn-group" role="group" aria-label="Navegacion principal">
                <button
                  type="button"
                  className={`btn btn-sm ${estaEnDashboard ? 'btn-outline-secondary' : 'btn-primary'}`}
                  onClick={() => navigate('/')}
                >
                  Buscar
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${estaEnDashboard ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => navigate('/dashboard')}
                >
                  Mi panel
                </button>
              </div>

              <button type="button" className="btn btn-primary btn-sm" onClick={cerrarSesion}>
                Cerrar sesion
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => abrirModalAuth('login')}>
              Iniciar sesion
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

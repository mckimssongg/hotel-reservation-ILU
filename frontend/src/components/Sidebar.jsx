import { NavLink } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export default function Sidebar({ visibleMovil, onCerrarMovil, onCerrarSesion }) {
  const { usuario } = useAuth()
  const esStaff = usuario?.es_staff === true

  const opcionesHuesped = [
    { path: '/dashboard/mis-reservaciones', label: 'Mis Reservaciones', icono: 'bi-journal-check' },
  ]

  const opcionesStaff = [
    { path: '/dashboard/reservaciones', label: 'Todas las Reservas', icono: 'bi-inboxes' },
    { path: '/dashboard/calendario', label: 'Calendario', icono: 'bi-calendar3' },
    { path: '/dashboard/estadisticas', label: 'Estadísticas', icono: 'bi-bar-chart-line' },
    { path: '/dashboard/lista-espera', label: 'Lista de Espera', icono: 'bi-clock-history' },
  ]

  const opcionesSidebar = esStaff ? opcionesStaff : opcionesHuesped

  return (
    <aside className={`dashboard-sidebar card border-0 shadow-sm rounded-4 ${visibleMovil ? 'd-block' : 'd-none'} d-md-block`}>
      <div className="card-body p-2">
        <div className="d-md-none d-flex justify-content-end mb-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCerrarMovil}>
            Cerrar
          </button>
        </div>

        <div className="list-group list-group-flush">
          {opcionesSidebar.map((opcion) => (
            <NavLink
              key={opcion.path}
              to={opcion.path}
              className={({ isActive }) =>
                `list-group-item list-group-item-action border-0 rounded-3 mb-1 ${isActive ? 'active' : ''}`
              }
              onClick={onCerrarMovil}
            >
              <i className={`bi ${opcion.icono} me-2`} />
              {opcion.label}
            </NavLink>
          ))}

          <button type="button" className="list-group-item list-group-item-action border-0 rounded-3 mb-1 text-danger" onClick={onCerrarSesion}>
            <i className="bi bi-box-arrow-right me-2" />
            Cerrar Sesion
          </button>
        </div>
      </div>
    </aside>
  )
}

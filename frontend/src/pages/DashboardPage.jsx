import { Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { cerrarSesion } = useAuth()
  const [sidebarVisibleMovil, setSidebarVisibleMovil] = useState(false)

  async function manejarCerrarSesion() {
    await cerrarSesion()
    navigate('/')
  }

  return (
    <>
      <Navbar mostrarMenuMovil={false} />

      <section className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="h2 mb-1">Panel de Usuario</h1>
            <p className="text-secondary mb-0">Gestiona tus reservaciones y seguimiento de espera</p>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary d-md-none"
            onClick={() => setSidebarVisibleMovil((anterior) => !anterior)}
          >
            <i className="bi bi-list me-2" />
            Menu
          </button>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-3">
            <Sidebar
              visibleMovil={sidebarVisibleMovil}
              onCerrarMovil={() => setSidebarVisibleMovil(false)}
              onCerrarSesion={manejarCerrarSesion}
            />
          </div>
          <div className="col-12 col-md-9">
            <Outlet />
          </div>
        </div>
      </section>
    </>
  )
}

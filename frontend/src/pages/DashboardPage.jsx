import { Outlet, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'

import ModalNotificacionEspera from '../components/ModalNotificacionEspera'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'
import { obtenerEntradasListaEsperaApi } from '../services/hotelApi'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { cerrarSesion, usuario, ejecutarConAuth } = useAuth()
  const [sidebarVisibleMovil, setSidebarVisibleMovil] = useState(false)
  const esStaff = usuario?.es_staff === true

  const [datosRetencion, setDatosRetencion] = useState(null)
  const wsRef = useRef(null)

  const cerrarWebSocket = useCallback(() => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    if (esStaff || !usuario) return

    let cancelado = false

    async function conectarSiHayEntradasActivas() {
      try {
        const { response, data } = await ejecutarConAuth((access) => obtenerEntradasListaEsperaApi(access))

        if (cancelado) return
        if (!response.ok) return

        const lista = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
        const entradasActivas = lista.filter((e) => e.estado === 'PENDIENTE' || e.estado === 'NOTIFICADA')

        if (entradasActivas.length === 0) return

        cerrarWebSocket()

        entradasActivas.forEach((entrada) => {
          const protocolo = window.location.protocol === 'https:' ? 'wss' : 'ws'
          const url = `${protocolo}://${window.location.host}/ws/lista-espera/${entrada.id}/`
          const ws = new WebSocket(url)

          ws.onmessage = (evento) => {
            try {
              const datos = JSON.parse(evento.data)
              if (datos.tipo === 'retencion_asignada') {
                setDatosRetencion(datos)
              }
              if (datos.tipo === 'retencion_expirada') {
                setDatosRetencion(null)
              }
            } catch {
              // mensaje no parseable, ignorar
            }
          }

          ws.onerror = () => {}
          ws.onclose = () => {}

          wsRef.current = ws
        })
      } catch {
        // sin conexion, no bloquear
      }
    }

    conectarSiHayEntradasActivas()

    return () => {
      cancelado = true
      cerrarWebSocket()
    }
  }, [usuario, esStaff, ejecutarConAuth, cerrarWebSocket])

  async function manejarCerrarSesion() {
    cerrarWebSocket()
    await cerrarSesion()
    navigate('/')
  }

  function manejarConfirmada() {
    // La reserva se confirmo, cerrar modal y dejar que el usuario lo vea
  }

  function manejarExpirada() {
    setDatosRetencion(null)
  }

  function cerrarModalNotificacion() {
    setDatosRetencion(null)
  }

  return (
    <>
      <Navbar mostrarMenuMovil={false} />

      <section className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="h2 mb-1">{esStaff ? 'Panel de Recepcionista' : 'Panel de Usuario'}</h1>
            {!esStaff && <p className="text-secondary mb-0">Gestiona tus reservaciones y seguimiento de espera</p>}
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

      {datosRetencion && (
        <ModalNotificacionEspera
          datosRetencion={datosRetencion}
          onConfirmada={manejarConfirmada}
          onExpirada={manejarExpirada}
          onCerrar={cerrarModalNotificacion}
        />
      )}
    </>
  )
}

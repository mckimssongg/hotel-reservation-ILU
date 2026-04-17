import { useEffect, useMemo, useState } from 'react'

import ModalModificarReserva from '../components/ModalModificarReserva'
import { filtrosDashboardIniciales, estadoReservaBadgeMap, estadoReservaTextoMap } from '../constants/appConstants'
import { useAuth } from '../hooks/useAuth'
import { cancelarReservaApi, obtenerReservasApi } from '../services/hotelApi'
import { formatearFechaCorta, formatearMoneda, obtenerMensajeError } from '../utils/hotelHelpers'

export default function MisReservasPage() {
  const { usuario, ejecutarConAuth } = useAuth()

  const [filtros, setFiltros] = useState(filtrosDashboardIniciales)
  const [reservas, setReservas] = useState([])
  const [cargandoReservas, setCargandoReservas] = useState(false)
  const [errorReservas, setErrorReservas] = useState('')

  const [modalModificarAbierto, setModalModificarAbierto] = useState(false)
  const [reservaParaModificar, setReservaParaModificar] = useState(null)

  const correoUsuario = useMemo(() => (usuario?.correo || '').toLowerCase(), [usuario?.correo])
  const reservasFiltradas = useMemo(() => {
    if (!correoUsuario) {
      return []
    }

    return reservas.filter((reserva) => (reserva.email_huesped || '').toLowerCase() === correoUsuario)
  }, [correoUsuario, reservas])

  useEffect(() => {
    cargarReservaciones()
  }, [])

  async function cargarReservaciones() {
    setCargandoReservas(true)
    setErrorReservas('')

    try {
      const params = new URLSearchParams({ page_size: '100' })
      if (filtros.estado) {
        params.append('estado', filtros.estado)
      }

      const { response, data } = await ejecutarConAuth((access) => obtenerReservasApi(params.toString(), access))
      if (!response.ok) {
        setErrorReservas(obtenerMensajeError(data, 'No se pudieron cargar tus reservaciones.'))
        setReservas([])
        return
      }

      const lista = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      setReservas(lista)
    } catch {
      setErrorReservas('No se pudo conectar con el backend para cargar reservaciones.')
      setReservas([])
    } finally {
      setCargandoReservas(false)
    }
  }

  async function cancelarReservacion(reservaId) {
    const confirmar = window.confirm('Deseas cancelar esta reservacion?')
    if (!confirmar) {
      return
    }

    setErrorReservas('')

    const { response, data } = await ejecutarConAuth((access) => cancelarReservaApi(reservaId, access))
    if (!response.ok) {
      setErrorReservas(obtenerMensajeError(data, 'No se pudo cancelar la reservacion.'))
      return
    }

    await cargarReservaciones()
  }

  function abrirModalModificar(reserva) {
    setReservaParaModificar(reserva)
    setModalModificarAbierto(true)
  }

  function cerrarModalModificar() {
    setModalModificarAbierto(false)
    setReservaParaModificar(null)
  }

  async function manejarModificacionExitosa() {
    setModalModificarAbierto(false)
    setReservaParaModificar(null)
    await cargarReservaciones()
  }

  function actualizarFiltro(event) {
    const { value } = event.target
    setFiltros((anterior) => ({ ...anterior, estado: value }))
  }

  async function aplicarFiltro(event) {
    event.preventDefault()
    await cargarReservaciones()
  }

  const puedeModificar = (estado) => estado === 'PENDIENTE' || estado === 'CONFIRMADA'

  return (
    <>
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
            <h2 className="h4 mb-0">Mis Reservaciones</h2>
            <form className="d-flex gap-2" onSubmit={aplicarFiltro}>
              <select className="form-select" value={filtros.estado} onChange={actualizarFiltro}>
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="REGISTRADA_ENTRADA">En estadia</option>
                <option value="REGISTRADA_SALIDA">Finalizada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
              <button type="submit" className="btn btn-outline-secondary">
                Filtrar
              </button>
            </form>
          </div>

          {!correoUsuario ? <p className="text-secondary mb-0">Preparando perfil de usuario...</p> : null}
          {errorReservas ? <div className="alert alert-danger">{errorReservas}</div> : null}
          {cargandoReservas ? <p className="text-secondary mb-0">Cargando reservaciones...</p> : null}

          {!cargandoReservas && correoUsuario && reservasFiltradas.length === 0 ? (
            <div className="rounded-4 p-4 text-center" style={{ backgroundColor: 'var(--hotel-color-fondo)' }}>
              <p className="mb-0 text-secondary">Todavia no tienes reservaciones en este panel.</p>
            </div>
          ) : null}

          <div className="d-grid gap-3">
            {reservasFiltradas.map((reserva) => (
              <article key={reserva.id} className="rounded-4 border p-3 shadow-sm">
                <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h3 className="h5 mb-0">Habitacion {reserva.habitacion?.numero || '-'}</h3>
                      <span className={`badge ${estadoReservaBadgeMap[reserva.estado] || 'text-bg-secondary'}`}>
                        {estadoReservaTextoMap[reserva.estado] || reserva.estado}
                      </span>
                    </div>
                    <p className="mb-1 text-secondary small">Codigo: {reserva.codigo_reserva}</p>
                    <p className="mb-0 text-secondary small">
                      {formatearFechaCorta(reserva.fecha_entrada)} - {formatearFechaCorta(reserva.fecha_salida)}
                    </p>
                  </div>
                  <div className="text-md-end">
                    <div className="fw-semibold">{formatearMoneda(reserva.precio_total || 0)}</div>
                    <div className="small text-secondary">{reserva.cantidad_huespedes} huespedes</div>
                  </div>
                </div>

                {puedeModificar(reserva.estado) ? (
                  <div className="mt-3 d-flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => abrirModalModificar(reserva)}
                    >
                      <i className="bi bi-pencil me-1" />
                      Modificar Fechas
                    </button>
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => cancelarReservacion(reserva.id)}>
                      Cancelar
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </div>

      <ModalModificarReserva
        abierto={modalModificarAbierto}
        reserva={reservaParaModificar}
        onCerrar={cerrarModalModificar}
        onModificacionExitosa={manejarModificacionExitosa}
      />
    </>
  )
}

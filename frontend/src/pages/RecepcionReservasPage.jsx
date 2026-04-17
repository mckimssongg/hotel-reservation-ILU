import { useEffect, useState } from 'react'

import { estadoReservaBadgeMap, estadoReservaTextoMap } from '../constants/appConstants'
import { useAuth } from '../hooks/useAuth'
import { obtenerReservasApi, registrarEntradaReservaApi, registrarSalidaReservaApi } from '../services/hotelApi'
import { formatearFechaCorta, formatearMoneda, obtenerMensajeError } from '../utils/hotelHelpers'

export default function RecepcionReservasPage() {
  const { ejecutarConAuth } = useAuth()

  const [filtros, setFiltros] = useState({ search: '' })
  const [reservas, setReservas] = useState([])
  const [cargandoReservas, setCargandoReservas] = useState(false)
  const [errorReservas, setErrorReservas] = useState('')

  useEffect(() => {
    cargarReservaciones()
  }, [])

  async function cargarReservaciones(search = filtros.search) {
    setCargandoReservas(true)
    setErrorReservas('')

    try {
      const params = new URLSearchParams({ page_size: '100' })
      if (search) {
        params.append('search', search)
      }

      const { response, data } = await ejecutarConAuth((access) => obtenerReservasApi(params.toString(), access))
      if (!response.ok) {
        setErrorReservas(obtenerMensajeError(data, 'No se pudieron cargar las reservaciones.'))
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

  function actualizarFiltro(event) {
    setFiltros({ search: event.target.value })
  }

  async function aplicarFiltro(event) {
    event.preventDefault()
    await cargarReservaciones(filtros.search)
  }

  async function manejarRegistrarEntrada(reservaId) {
    setErrorReservas('')
    const { response, data } = await ejecutarConAuth((access) => registrarEntradaReservaApi(reservaId, access))
    if (!response.ok) {
      setErrorReservas(obtenerMensajeError(data, 'No se pudo registrar la entrada.'))
      return
    }
    await cargarReservaciones()
  }

  async function manejarRegistrarSalida(reservaId) {
    setErrorReservas('')
    const { response, data } = await ejecutarConAuth((access) => registrarSalidaReservaApi(reservaId, access))
    if (!response.ok) {
      setErrorReservas(obtenerMensajeError(data, 'No se pudo registrar la salida.'))
      return
    }
    await cargarReservaciones()
  }

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-body">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
          <h2 className="h4 mb-0">Todas las Reservaciones</h2>
          <form className="d-flex gap-2" onSubmit={aplicarFiltro}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Buscar (codigo, nombre...)" 
              value={filtros.search} 
              onChange={actualizarFiltro} 
            />
            <button type="submit" className="btn btn-outline-secondary">
              Buscar
            </button>
          </form>
        </div>

        {errorReservas ? <div className="alert alert-danger">{errorReservas}</div> : null}
        {cargandoReservas ? <p className="text-secondary mb-0">Cargando reservaciones...</p> : null}

        {!cargandoReservas && reservas.length === 0 ? (
          <div className="rounded-4 p-4 text-center" style={{ backgroundColor: 'var(--hotel-color-fondo)' }}>
            <p className="mb-0 text-secondary">No se encontraron reservaciones con esos filtros.</p>
          </div>
        ) : null}

        <div className="d-grid gap-3">
          {reservas.map((reserva) => (
            <article key={reserva.id} className="rounded-4 border p-3 shadow-sm">
              <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h3 className="h5 mb-0">Habitacion {reserva.habitacion?.numero || '-'}</h3>
                    <span className={`badge ${estadoReservaBadgeMap[reserva.estado] || 'text-bg-secondary'}`}>
                      {estadoReservaTextoMap[reserva.estado] || reserva.estado}
                    </span>
                  </div>
                  <p className="mb-1 text-secondary small">
                    Codigo: <strong>{reserva.codigo_reserva}</strong> | Huesped: {reserva.nombre_huesped}
                  </p>
                  <p className="mb-0 text-secondary small">
                    {formatearFechaCorta(reserva.fecha_entrada)} - {formatearFechaCorta(reserva.fecha_salida)}
                  </p>
                </div>
                <div className="text-md-end">
                  <div className="fw-semibold">{formatearMoneda(reserva.precio_total || 0)}</div>
                  <div className="small text-secondary">{reserva.cantidad_huespedes} huespedes</div>
                </div>
              </div>

              <div className="mt-3 d-flex gap-2 flex-wrap">
                {reserva.estado === 'CONFIRMADA' ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => manejarRegistrarEntrada(reserva.id)}>
                    Registrar Entrada (Check-in)
                  </button>
                ) : null}
                
                {reserva.estado === 'REGISTRADA_ENTRADA' ? (
                  <button type="button" className="btn btn-warning btn-sm" onClick={() => manejarRegistrarSalida(reserva.id)}>
                    Registrar Salida (Check-out)
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

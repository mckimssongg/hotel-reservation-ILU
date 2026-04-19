import { useEffect, useState } from 'react'

import { estadoReservaBadgeMap, estadoReservaTextoMap } from '../constants/appConstants'
import { useAuth } from '../hooks/useAuth'
import { obtenerReservasApi, registrarEntradaReservaApi, registrarSalidaReservaApi } from '../services/hotelApi'
import { formatearFechaCorta, obtenerMensajeError } from '../utils/hotelHelpers'

const ESTADOS_FILTRO = ['Todos', 'CONFIRMADA', 'REGISTRADA_ENTRADA', 'REGISTRADA_SALIDA', 'CANCELADA']
const PAGINA_SIZE = 5

function obtenerHoyISO() {
  return new Date().toISOString().split('T')[0]
}

export default function RecepcionReservasPage() {
  const { ejecutarConAuth } = useAuth()

  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)

  useEffect(() => {
    cargarReservaciones()
  }, [])

  async function cargarReservaciones() {
    setCargando(true)
    setError('')

    try {
      const params = new URLSearchParams({ page_size: '200' })
      const { response, data } = await ejecutarConAuth((access) => obtenerReservasApi(params.toString(), access))

      if (!response.ok) {
        setError(obtenerMensajeError(data, 'No se pudieron cargar las reservaciones.'))
        setReservas([])
        return
      }

      const lista = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      setReservas(lista)
    } catch {
      setError('No se pudo conectar con el backend.')
      setReservas([])
    } finally {
      setCargando(false)
    }
  }

  async function manejarCheckIn(reservaId) {
    setError('')
    const { response, data } = await ejecutarConAuth((access) => registrarEntradaReservaApi(reservaId, access))
    if (!response.ok) {
      setError(obtenerMensajeError(data, 'No se pudo registrar la entrada.'))
      return
    }
    setReservas((prev) =>
      prev.map((r) =>
        r.id === reservaId ? { ...r, estado: 'REGISTRADA_ENTRADA' } : r
      )
    )
  }

  async function manejarCheckOut(reservaId) {
    setError('')
    const { response, data } = await ejecutarConAuth((access) => registrarSalidaReservaApi(reservaId, access))
    if (!response.ok) {
      setError(obtenerMensajeError(data, 'No se pudo registrar la salida.'))
      return
    }
    setReservas((prev) =>
      prev.map((r) =>
        r.id === reservaId ? { ...r, estado: 'REGISTRADA_SALIDA' } : r
      )
    )
  }

  const hoy = obtenerHoyISO()

  function filtrarLleganHoy() {
    setFiltroEstado('CONFIRMADA')
    setFiltroBusqueda('')
  }

  function filtrarSalenHoy() {
    setFiltroEstado('REGISTRADA_ENTRADA')
    setFiltroBusqueda('')
  }

  const reservasFiltradas = reservas.filter((r) => {
    if (filtroEstado !== 'Todos' && r.estado !== filtroEstado) return false

    if (filtroBusqueda) {
      const termino = filtroBusqueda.toLowerCase()
      const coincide =
        r.codigo_reserva?.toLowerCase().includes(termino) ||
        r.nombre_huesped?.toLowerCase().includes(termino) ||
        r.habitacion?.numero?.toString().includes(termino)
      if (!coincide) return false
    }

    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(reservasFiltradas.length / PAGINA_SIZE))
  const inicio = (paginaActual - 1) * PAGINA_SIZE
  const reservasPagina = reservasFiltradas.slice(inicio, inicio + PAGINA_SIZE)

  const activas = reservas.filter((r) => r.estado === 'REGISTRADA_ENTRADA').length
  const pendientes = reservas.filter((r) => r.estado === 'CONFIRMADA').length

  useEffect(() => {
    setPaginaActual(1)
  }, [filtroEstado, filtroBusqueda])

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h2 className="h4 mb-0">Gestión de Reservas</h2>
        <div className="d-flex gap-3">
          <div className="text-center">
            <div className="fw-bold h5 mb-0">{reservas.length}</div>
            <small className="text-secondary">TOTAL</small>
          </div>
          <div className="text-center">
            <div className="fw-bold h5 mb-0" style={{ color: 'var(--hotel-color-primario)' }}>{activas}</div>
            <small className="text-secondary">ACTIVAS</small>
          </div>
          <div className="text-center">
            <div className="fw-bold h5 mb-0 text-warning">{pendientes}</div>
            <small className="text-secondary">PENDIENTES</small>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar codigo, huesped, habitacion..."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              style={{ maxWidth: 280 }}
            />

            <select
              className="form-select"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{ maxWidth: 180 }}
            >
              {ESTADOS_FILTRO.map((est) => (
                <option key={est} value={est}>
                  {est === 'Todos' ? 'Todos' : (estadoReservaTextoMap[est] || est)}
                </option>
              ))}
            </select>

            <button type="button" className="btn btn-outline-hotel-primary btn-sm" onClick={filtrarLleganHoy}>
              <i className="bi bi-box-arrow-in-right me-1" />
              Llegan hoy
            </button>
            <button type="button" className="btn btn-outline-hotel-primary btn-sm" onClick={filtrarSalenHoy}>
              <i className="bi bi-box-arrow-right me-1" />
              Salen hoy
            </button>

            <button
              type="button"
              className="btn btn-hotel-primary btn-sm ms-auto"
              onClick={cargarReservaciones}
              disabled={cargando}
            >
              <i className="bi bi-arrow-clockwise me-1" />
              Refrescar
            </button>
          </div>

          {error && (
            <div className="alert alert-danger rounded-3 py-2" role="alert">
              <i className="bi bi-exclamation-triangle me-2" />{error}
            </div>
          )}

          {cargando && <p className="text-secondary mb-0">Cargando reservaciones...</p>}

          {!cargando && reservasFiltradas.length === 0 && (
            <div className="text-center py-4 text-secondary">
              <i className="bi bi-inbox display-5 d-block mb-2" />
              No se encontraron reservaciones con esos filtros.
            </div>
          )}

          {!cargando && reservasPagina.length > 0 && (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead style={{ backgroundColor: 'var(--hotel-color-secundario)' }}>
                    <tr className="text-secondary small">
                      <th className="py-3 px-3 rounded-start">CÓDIGO</th>
                      <th className="py-3 px-3">HUÉSPED</th>
                      <th className="py-3 px-3">HABITACIÓN</th>
                      <th className="py-3 px-3">ESTADÍA</th>
                      <th className="py-3 px-3">ESTADO</th>
                      <th className="py-3 px-3 text-end rounded-end">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservasPagina.map((reserva) => (
                      <FilaReserva
                        key={reserva.id}
                        reserva={reserva}
                        hoy={hoy}
                        onCheckIn={manejarCheckIn}
                        onCheckOut={manejarCheckOut}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <nav className="d-flex justify-content-between align-items-center mt-3">
                  <small className="text-secondary">
                    {inicio + 1}–{Math.min(inicio + PAGINA_SIZE, reservasFiltradas.length)} de {reservasFiltradas.length}
                  </small>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className="btn btn-outline-hotel-primary"
                      disabled={paginaActual <= 1}
                      onClick={() => setPaginaActual((p) => p - 1)}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-hotel-primary"
                      disabled={paginaActual >= totalPaginas}
                      onClick={() => setPaginaActual((p) => p + 1)}
                    >
                      Siguiente
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function FilaReserva({ reserva, hoy, onCheckIn, onCheckOut }) {
  const tipoTexto = reserva.habitacion?.tipo_habitacion_nombre || ''
  const numero = reserva.habitacion?.numero || '-'

  const esLlegaHoy = reserva.fecha_entrada === hoy && reserva.estado === 'CONFIRMADA'
  const esSaleHoy = reserva.fecha_salida === hoy && reserva.estado === 'REGISTRADA_ENTRADA'

  return (
    <tr>
      <td>
        <span className="fw-semibold" style={{ color: 'var(--hotel-color-primario)' }}>
          {reserva.codigo_reserva}
        </span>
      </td>
      <td>{reserva.nombre_huesped}</td>
      <td>
        <i className="bi bi-door-closed me-1" />
        {numero} {tipoTexto ? `(${tipoTexto})` : ''}
      </td>
      <td className="small text-secondary">
        {formatearFechaCorta(reserva.fecha_entrada)}<br />
        {formatearFechaCorta(reserva.fecha_salida)}
      </td>
      <td>
        <span className={`badge rounded-pill ${estadoReservaBadgeMap[reserva.estado] || 'bg-light text-dark border'}`} style={reserva.estado === 'CONFIRMADA' ? { backgroundColor: 'var(--hotel-color-primario)' } : {}}>
          {estadoReservaTextoMap[reserva.estado] || reserva.estado}
        </span>
        {esLlegaHoy && <i className="bi bi-arrow-right-circle-fill ms-2" style={{ color: 'var(--hotel-color-primario)' }} title="Llega hoy" />}
        {esSaleHoy && <i className="bi bi-arrow-left-circle-fill text-warning ms-2" title="Sale hoy" />}
      </td>
      <td className="text-end">
        {reserva.estado === 'CONFIRMADA' && (
          <button
            type="button"
            className="btn btn-sm btn-hotel-primary"
            onClick={() => onCheckIn(reserva.id)}
            title="Registrar entrada"
          >
            <i className="bi bi-box-arrow-in-right me-1" />
            Check-in
          </button>
        )}
        {reserva.estado === 'REGISTRADA_ENTRADA' && (
          <button
            type="button"
            className="btn btn-sm btn-hotel-primary"
            onClick={() => onCheckOut(reserva.id)}
            title="Registrar salida"
          >
            <i className="bi bi-box-arrow-right me-1" />
            Check-out
          </button>
        )}
      </td>
    </tr>
  )
}

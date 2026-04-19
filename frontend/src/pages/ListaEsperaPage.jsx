import { useEffect, useState } from 'react'

import { useAuth } from '../hooks/useAuth'
import { obtenerEntradasListaEsperaApi, cancelarEntradaListaEsperaApi } from '../services/hotelApi'
import { formatearFechaCorta, obtenerMensajeError } from '../utils/hotelHelpers'

const ESTADO_BADGE_ESTILO = {
  PENDIENTE: { bg: '#fde68a', color: '#92400e' },
  NOTIFICADA: { bg: '#bfdbfe', color: '#1e40af' },
  COMPLETADA: { bg: '#bbf7d0', color: '#166534' },
  EXPIRADA: { bg: '#e5e7eb', color: '#374151' },
}

const ESTADO_TEXTO = {
  PENDIENTE: 'En espera',
  NOTIFICADA: 'Habitación retenida',
  COMPLETADA: 'Completada',
  EXPIRADA: 'Expirada',
}

export default function ListaEsperaPage() {
  const { usuario } = useAuth()
  const esStaff = usuario?.es_staff === true

  if (esStaff) return <VistaStaffListaEspera />
  return <VistaHuespedListaEspera />
}

const PAGINA_SIZE = 5

function VistaStaffListaEspera() {
  const { ejecutarConAuth } = useAuth()
  const [entradas, setEntradas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)

  useEffect(() => {
    cargarEntradas()
  }, [])

  async function cargarEntradas() {
    setCargando(true)
    setError('')

    try {
      const { response, data } = await ejecutarConAuth((access) => obtenerEntradasListaEsperaApi(access))

      if (!response.ok) {
        setError(obtenerMensajeError(data, 'No se pudieron cargar las entradas.'))
        setEntradas([])
        return
      }

      const lista = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      setEntradas(lista)
      setPaginaActual(1)
    } catch {
      setError('Error de conexion al cargar la lista de espera.')
      setEntradas([])
    } finally {
      setCargando(false)
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(entradas.length / PAGINA_SIZE))
  const inicio = (paginaActual - 1) * PAGINA_SIZE
  const entradasPagina = entradas.slice(inicio, inicio + PAGINA_SIZE)

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">
          <i className="bi bi-clock-history me-2" />
          Demanda Reprimida – Lista de Espera
        </h2>
        <div className="d-flex gap-3 align-items-center">
            <div className="text-center">
              <div className="fw-bold h5 mb-0">{entradas.length}</div>
              <small className="text-secondary">TOTAL EN ESPERA</small>
            </div>
            <button type="button" className="btn btn-hotel-primary btn-sm" onClick={cargarEntradas} disabled={cargando}>
              <i className="bi bi-arrow-clockwise me-1" />
              Refrescar
            </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger rounded-3" role="alert">
          <i className="bi bi-exclamation-triangle me-2" />{error}
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body">
          {cargando && <p className="text-secondary mb-0">Cargando entradas...</p>}

          {!cargando && entradas.length === 0 && !error && (
            <div className="text-center py-4 text-secondary">
              <i className="bi bi-inbox display-5 d-block mb-2" />
              No hay huéspedes en lista de espera actualmente.
            </div>
          )}

          {!cargando && entradas.length > 0 && (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead style={{ backgroundColor: 'var(--hotel-color-secundario)' }}>
                    <tr className="text-secondary small">
                      <th className="py-3 px-3 rounded-start">HUÉSPED</th>
                      <th className="py-3 px-3">RANGO SOLICITADO</th>
                      <th className="py-3 px-3">TIPO</th>
                      <th className="py-3 px-3 text-center">FLEXIBILIDAD</th>
                      <th className="py-3 px-3">ESTADO</th>
                      <th className="py-3 px-3 rounded-end">INSCRIPCIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entradasPagina.map((entrada) => (
                      <tr key={entrada.id}>
                        <td className="fw-semibold px-3 py-3" style={{ color: 'var(--hotel-color-primario)' }}>{entrada.nombre_huesped}</td>
                        <td className="small px-3 py-3">
                          {formatearFechaCorta(entrada.fecha_entrada_preferida)} – {formatearFechaCorta(entrada.fecha_salida_preferida)}
                        </td>
                        <td className="px-3 py-3">{entrada.tipo_habitacion_nombre || '-'}</td>
                        <td className="text-center px-3 py-3">
                          {entrada.es_flexible ? (
                            <span className="badge rounded-pill" style={{ backgroundColor: '#bbf7d0', color: '#166534' }}>Sí (±{entrada.dias_flexibles}d)</span>
                          ) : (
                            <span className="badge rounded-pill" style={{ backgroundColor: '#e5e7eb', color: '#374151' }}>No</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {(() => { const s = ESTADO_BADGE_ESTILO[entrada.estado] || { bg: '#e5e7eb', color: '#374151' }; return (
                            <span className="badge rounded-pill" style={{ backgroundColor: s.bg, color: s.color }}>
                              {ESTADO_TEXTO[entrada.estado] || entrada.estado}
                            </span>
                          ) })()}
                        </td>
                        <td className="small text-secondary px-3 py-3">{formatearFechaCorta(entrada.creado_en)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <nav className="d-flex justify-content-between align-items-center mt-3">
                  <small className="text-secondary">
                    {inicio + 1}–{Math.min(inicio + PAGINA_SIZE, entradas.length)} de {entradas.length}
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

function VistaHuespedListaEspera() {
  const { ejecutarConAuth } = useAuth()
  const [entradas, setEntradas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [toastMensaje, setToastMensaje] = useState('')
  const [idACancelar, setIdACancelar] = useState(null)

  useEffect(() => {
    cargarEntradas()
  }, [])

  useEffect(() => {
    if (!toastMensaje) return
    const timer = setTimeout(() => setToastMensaje(''), 4000)
    return () => clearTimeout(timer)
  }, [toastMensaje])

  async function cargarEntradas() {
    setCargando(true)
    setError('')

    try {
      const { response, data } = await ejecutarConAuth((access) => obtenerEntradasListaEsperaApi(access))

      if (!response.ok) {
        setError(obtenerMensajeError(data, 'No se pudieron cargar tus entradas.'))
        setEntradas([])
        return
      }

      const lista = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      setEntradas(lista)
    } catch {
      setError('Error de conexión al cargar tus listas de espera.')
      setEntradas([])
    } finally {
      setCargando(false)
    }
  }

  function manejarCancelar(id) {
    setIdACancelar(id)
  }

  async function confirmarCancelacion() {
    if (!idACancelar) return

    try {
      const { response, data } = await ejecutarConAuth((access) => cancelarEntradaListaEsperaApi(idACancelar, access))

      if (response.ok) {
        setEntradas((anteriores) => anteriores.filter((e) => e.id !== idACancelar))
        setToastMensaje('Inscripción cancelada exitosamente.')
      } else {
        setError(obtenerMensajeError(data, 'No se pudo cancelar la inscripción.'))
      }
    } catch {
      setError('Error de conexión al cancelar.')
    } finally {
      setIdACancelar(null)
    }
  }

  return (
    <div>
      <h2 className="h4 mb-4">Mis Listas de Espera</h2>

      {error && (
        <div className="alert alert-danger rounded-3" role="alert">
          {error}
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body">
          {cargando && <p className="text-secondary">Cargando...</p>}

          {!cargando && entradas.length === 0 && !error && (
            <div className="text-center py-4 text-secondary">
              <i className="bi bi-inbox display-5 d-block mb-2" />
              No tienes ninguna inscripción en lista de espera.
            </div>
          )}

          {!cargando && entradas.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ backgroundColor: 'var(--hotel-color-secundario)' }}>
                  <tr className="small text-secondary">
                    <th className="py-3 px-3 rounded-start">TIPO HABITACIÓN</th>
                    <th className="py-3 px-3">FECHAS SOLICITADAS</th>
                    <th className="py-3 px-3">FLEXIBILIDAD</th>
                    <th className="py-3 px-3">ESTADO</th>
                    <th className="py-3 px-3 text-end rounded-end">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {entradas.map((entrada) => (
                    <tr key={entrada.id}>
                      <td className="px-3 py-3 fw-medium">{entrada.tipo_habitacion_nombre || '-'}</td>
                      <td className="px-3 py-3">
                        {formatearFechaCorta(entrada.fecha_entrada_preferida)} – {formatearFechaCorta(entrada.fecha_salida_preferida)}
                      </td>
                      <td className="px-3 py-3 text-secondary">
                        {entrada.es_flexible ? `±${entrada.dias_flexibles} días` : 'Exacta'}
                      </td>
                      <td className="px-3 py-3">
                        {(() => { const s = ESTADO_BADGE_ESTILO[entrada.estado] || { bg: '#e5e7eb', color: '#374151' }; return (
                          <span className="badge rounded-pill" style={{ backgroundColor: s.bg, color: s.color }}>
                            {ESTADO_TEXTO[entrada.estado] || entrada.estado}
                          </span>
                        ) })()}
                      </td>
                      <td className="px-3 py-3 text-end">
                        {entrada.estado === 'PENDIENTE' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => manejarCancelar(entrada.id)}
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toastMensaje && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1100 }}>
          <div className="toast show align-items-center text-bg-success border-0 rounded-3 shadow" role="alert">
            <div className="d-flex">
              <div className="toast-body">
                <i className="bi bi-check-circle me-2" />
                {toastMensaje}
              </div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setToastMensaje('')} />
            </div>
          </div>
        </div>
      )}

      {idACancelar && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center p-3" style={{ zIndex: 1080 }} onClick={() => setIdACancelar(null)}>
          <div className="card border-0 rounded-4 shadow-sm w-100" style={{ maxWidth: 500 }} onClick={(event) => event.stopPropagation()}>
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <h3 className="h5 mb-0 text-danger">
                  <i className="bi bi-exclamation-triangle me-2" />
                  Cancelar Lista de Espera
                </h3>
                <button type="button" className="btn-close" onClick={() => setIdACancelar(null)} aria-label="Cerrar" />
              </div>
              <p className="mb-4 text-secondary">
                ¿Estás seguro de que deseas cancelar tu inscripción en la lista de espera? 
                Dejarás de recibir notificaciones de disponibilidad. Esta acción no se puede deshacer.
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setIdACancelar(null)}>
                  No, mantener
                </button>
                <button type="button" className="btn btn-danger" onClick={confirmarCancelacion}>
                  Sí, cancelar inscripción
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'


import { useAuth } from '../hooks/useAuth'
import { obtenerEntradasListaEsperaApi } from '../services/hotelApi'
import { formatearFechaCorta, obtenerMensajeError } from '../utils/hotelHelpers'

const ESTADO_BADGE = {
  ESPERANDO: 'text-bg-warning',
  RETENIDA: 'text-bg-info',
  CONFIRMADA: 'text-bg-success',
  EXPIRADA: 'text-bg-secondary',
}

export default function ListaEsperaPage() {
  const { usuario } = useAuth()
  const esStaff = usuario?.es_staff === true

  if (esStaff) return <VistaStaffListaEspera />
  return <Navigate to="/" replace />
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
                      <th className="py-3 px-3">EMAIL</th>
                      <th className="py-3 px-3">TIPO SOLICITADO</th>
                      <th className="py-3 px-3">FECHAS PREFERIDAS</th>
                      <th className="py-3 px-3 text-center">HUÉSPEDES</th>
                      <th className="py-3 px-3">ESTADO</th>
                      <th className="py-3 px-3 rounded-end">INSCRIPCIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entradasPagina.map((entrada) => (
                      <tr key={entrada.id}>
                        <td className="fw-semibold px-3 py-3" style={{ color: 'var(--hotel-color-primario)' }}>{entrada.nombre_huesped}</td>
                        <td className="small text-secondary px-3 py-3">{entrada.email_huesped}</td>
                        <td className="px-3 py-3">{entrada.tipo_habitacion_nombre || entrada.tipo_habitacion_id || '-'}</td>
                        <td className="small px-3 py-3">
                          {formatearFechaCorta(entrada.fecha_entrada_preferida)} – {formatearFechaCorta(entrada.fecha_salida_preferida)}
                          {entrada.es_flexible && (
                            <span className="badge bg-light text-dark border ms-2" title={`±${entrada.dias_flexibles} días`}>
                              <i className="bi bi-arrow-left-right me-1" />±{entrada.dias_flexibles}d
                            </span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3">{entrada.cantidad_huespedes}</td>
                        <td className="px-3 py-3">
                          <span className={`badge rounded-pill ${ESTADO_BADGE[entrada.estado] || 'bg-light text-dark border'}`} style={entrada.estado === 'ESPERANDO' ? { backgroundColor: 'var(--hotel-color-primario)' } : {}}>
                            {entrada.estado}
                          </span>
                        </td>
                        <td className="small text-secondary px-3 py-3">{formatearFechaCorta(entrada.creado_en || entrada.created_at)}</td>
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

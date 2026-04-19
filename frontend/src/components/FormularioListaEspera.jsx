import { useEffect, useState } from 'react'

import { useAuth } from '../hooks/useAuth'
import { crearEntradaListaEsperaApi, obtenerTiposHabitacion } from '../services/hotelApi'
import { obtenerMensajeError } from '../utils/hotelHelpers'

const formularioBase = {
  tipo_habitacion_id: '',
  nombre_huesped: '',
  email_huesped: '',
  telefono_huesped: '',
  fecha_entrada_preferida: '',
  fecha_salida_preferida: '',
  cantidad_huespedes: 1,
  es_flexible: false,
  dias_flexibles: 2,
}

export default function FormularioListaEspera({ datosIniciales = {}, onEntradaCreada }) {
  const { usuario } = useAuth()

  const [formulario, setFormulario] = useState(() => {
    const nombreCompleto = usuario
      ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario?.usuario
      : ''

    return {
      ...formularioBase,
      nombre_huesped: nombreCompleto,
      email_huesped: usuario?.email || '',
      fecha_entrada_preferida: datosIniciales.fecha_entrada_preferida || '',
      fecha_salida_preferida: datosIniciales.fecha_salida_preferida || '',
      cantidad_huespedes: datosIniciales.cantidad_huespedes || 1,
    }
  })
  const [tiposHabitacion, setTiposHabitacion] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const camposUsuarioLlenados = Boolean(usuario?.email)

  useEffect(() => {
    async function cargarTipos() {
      try {
        const { response, data } = await obtenerTiposHabitacion()
        if (response.ok && data?.results) {
          setTiposHabitacion(data.results)
        }
      } catch {
        console.warn('No se pudieron cargar los tipos de habitacion.')
      }
    }
    cargarTipos()
  }, [])

  function actualizarCampo(campo, valor) {
    setFormulario((prev) => ({ ...prev, [campo]: valor }))
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)

    const payload = {
      ...formulario,
      tipo_habitacion_id: Number(formulario.tipo_habitacion_id),
      cantidad_huespedes: Number(formulario.cantidad_huespedes),
      dias_flexibles: formulario.es_flexible ? Number(formulario.dias_flexibles) : 2,
    }

    try {
      const { response, data } = await crearEntradaListaEsperaApi(payload)

      if (!response.ok) {
        setError(obtenerMensajeError(data, 'No se pudo crear la solicitud.'))
        return
      }

      onEntradaCreada(data.id)
    } catch {
      setError('Error de conexion al crear la solicitud.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-body">
        <h3 className="h5 mb-3">
          <i className="bi bi-clock-history me-2" />
          Inscribirse en lista de espera
        </h3>
        <p className="text-secondary small mb-3">
          Si no hay disponibilidad, te avisaremos en tiempo real cuando se libere una habitación compatible.
        </p>

        {error && (
          <div className="alert alert-danger rounded-3" role="alert">
            <i className="bi bi-exclamation-triangle me-2" />
            {error}
          </div>
        )}

        <form onSubmit={manejarSubmit}>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label htmlFor="le-nombre" className="form-label small fw-semibold">Nombre</label>
              <input
                id="le-nombre"
                type="text"
                className="form-control"
                value={formulario.nombre_huesped}
                onChange={(e) => actualizarCampo('nombre_huesped', e.target.value)}
                readOnly={camposUsuarioLlenados}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="le-email" className="form-label small fw-semibold">Email</label>
              <input
                id="le-email"
                type="email"
                className="form-control"
                value={formulario.email_huesped}
                onChange={(e) => actualizarCampo('email_huesped', e.target.value)}
                readOnly={camposUsuarioLlenados}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="le-telefono" className="form-label small fw-semibold">Teléfono</label>
              <input
                id="le-telefono"
                type="tel"
                className="form-control"
                value={formulario.telefono_huesped}
                onChange={(e) => actualizarCampo('telefono_huesped', e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="le-tipo" className="form-label small fw-semibold">Tipo de habitación</label>
              <select
                id="le-tipo"
                className="form-select"
                value={formulario.tipo_habitacion_id}
                onChange={(e) => actualizarCampo('tipo_habitacion_id', e.target.value)}
                required
              >
                <option value="">Seleccionar...</option>
                {tiposHabitacion.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-4">
              <label htmlFor="le-entrada" className="form-label small fw-semibold">Fecha entrada</label>
              <input
                id="le-entrada"
                type="date"
                className="form-control"
                value={formulario.fecha_entrada_preferida}
                onChange={(e) => actualizarCampo('fecha_entrada_preferida', e.target.value)}
                required
              />
            </div>
            <div className="col-6 col-md-4">
              <label htmlFor="le-salida" className="form-label small fw-semibold">Fecha salida</label>
              <input
                id="le-salida"
                type="date"
                className="form-control"
                value={formulario.fecha_salida_preferida}
                onChange={(e) => actualizarCampo('fecha_salida_preferida', e.target.value)}
                required
              />
            </div>
            <div className="col-6 col-md-4">
              <label htmlFor="le-huespedes" className="form-label small fw-semibold">Huéspedes</label>
              <input
                id="le-huespedes"
                type="number"
                className="form-control"
                min={1}
                max={10}
                value={formulario.cantidad_huespedes}
                onChange={(e) => actualizarCampo('cantidad_huespedes', e.target.value)}
                required
              />
            </div>

            <div className="col-12">
              <div className="form-check">
                <input
                  id="le-flexible"
                  type="checkbox"
                  className="form-check-input"
                  checked={formulario.es_flexible}
                  onChange={(e) => actualizarCampo('es_flexible', e.target.checked)}
                />
                <label htmlFor="le-flexible" className="form-check-label">
                  Tengo flexibilidad de fechas
                </label>
              </div>
            </div>

            {formulario.es_flexible && (
              <div className="col-12 col-md-4">
                <label htmlFor="le-dias-flex" className="form-label small fw-semibold">
                  Días de flexibilidad (±)
                </label>
                <input
                  id="le-dias-flex"
                  type="number"
                  className="form-control"
                  min={1}
                  max={5}
                  value={formulario.dias_flexibles}
                  onChange={(e) => actualizarCampo('dias_flexibles', e.target.value)}
                />
              </div>
            )}

            <div className="col-12">
              <button type="submit" className="btn btn-hotel-primary" disabled={cargando}>
                {cargando ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2" />
                    Inscribirme en lista de espera
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

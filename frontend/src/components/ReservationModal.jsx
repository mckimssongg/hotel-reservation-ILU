import { useEffect, useState } from 'react'

import { crearReservaApi, obtenerPrecioHabitacionApi } from '../services/hotelApi'
import { formatearMoneda, obtenerMensajeError, validarRangoFechas } from '../utils/hotelHelpers'
import { useAuth } from '../hooks/useAuth'
import DesglosePrecio from './DesglosePrecio'

const formularioInicial = {
  nombre_huesped: '',
  email_huesped: '',
  telefono_huesped: '',
  notas: '',
}

export default function ReservationModal({ abierto, habitacion, filtrosBusqueda, onCerrar, onReservaCreada, onConflicto }) {
  const { usuario } = useAuth()
  const [formulario, setFormulario] = useState(formularioInicial)
  const [errorReserva, setErrorReserva] = useState('')
  const [exitoReserva, setExitoReserva] = useState('')
  const [codigoReserva, setCodigoReserva] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [detallesNoches, setDetallesNoches] = useState([])
  const [descuento_aplicado, setDescuentoAplicado] = useState(null)
  const [precioTotalDesglose, setPrecioTotalDesglose] = useState(0)
  const [cargandoDesglose, setCargandoDesglose] = useState(false)
  const camposUsuarioLlenados = Boolean(usuario?.correo)

  useEffect(() => {
    if (!abierto) {
      return
    }

    const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim()
    setFormulario({
      nombre_huesped: nombre || usuario?.usuario || '',
      email_huesped: usuario?.correo || '',
      telefono_huesped: '',
      notas: '',
    })
    setErrorReserva('')
    setExitoReserva('')
    setCodigoReserva('')
    setDetallesNoches([])
    setPrecioTotalDesglose(0)

    cargarDesglosePrecio()
  }, [abierto, usuario?.apellido, usuario?.correo, usuario?.nombre, usuario?.usuario])

  async function cargarDesglosePrecio() {
    if (!habitacion?.id || !filtrosBusqueda?.fecha_entrada || !filtrosBusqueda?.fecha_salida) {
      return
    }

    setCargandoDesglose(true)

    try {
      const params = new URLSearchParams({
        fecha_entrada: filtrosBusqueda.fecha_entrada,
        fecha_salida: filtrosBusqueda.fecha_salida,
        codigo_descuento: formulario.codigo_descuento,
      })
      const { response, data } = await obtenerPrecioHabitacionApi(habitacion.id, params.toString())

      if (response.ok && data) {
        setDetallesNoches(data.detalles_noches || [])
        setPrecioTotalDesglose(data.total || 0)
        setDescuentoAplicado(data.descuento_especial || 0)
      }
    } catch {
      // No bloquear flujo si falla el desglose
    } finally {
      setCargandoDesglose(false)
    }
  }

  if (!abierto || !habitacion) {
    return null
  }

  function actualizarCampo(event) {
    const { name, value } = event.target
    setFormulario((anterior) => ({ ...anterior, [name]: value }))
  }

  async function enviarReserva(event) {
    event.preventDefault()
    setErrorReserva('')
    setExitoReserva('')

    const errorFechas = validarRangoFechas(filtrosBusqueda.fecha_entrada, filtrosBusqueda.fecha_salida)
    if (errorFechas) {
      setErrorReserva(errorFechas)
      return
    }

    if (!formulario.telefono_huesped) {
      setErrorReserva('El telefono es requerido para confirmar la reservacion.')
      return
    }

    setGuardando(true)

    try {
      const payload = {
        habitacion_id: habitacion.id,
        nombre_huesped: formulario.nombre_huesped,
        email_huesped: formulario.email_huesped,
        telefono_huesped: formulario.telefono_huesped,
        fecha_entrada: filtrosBusqueda.fecha_entrada,
        fecha_salida: filtrosBusqueda.fecha_salida,
        cantidad_huespedes: Number(filtrosBusqueda.cantidad_huespedes || 1),
        notas: formulario.notas,
        codigo_descuento: formulario.codigo_descuento,
      }

      const { response, data } = await crearReservaApi(payload)

      if (!response.ok) {
        if (response.status === 409) {
          onCerrar()
          if (onConflicto) {
            onConflicto(obtenerMensajeError(data, 'Lo sentimos, otro huesped acaba de reservar esta habitacion.'))
          }
          return
        }
        setErrorReserva(obtenerMensajeError(data, 'No se pudo crear la reservacion.'))
        return
      }

      const codigo = data?.codigo_reserva || '-'
      setCodigoReserva(codigo)
      setExitoReserva(`Reservacion confirmada exitosamente.`)

      if (onReservaCreada) {
        onReservaCreada(data)
      }
    } catch {
      setErrorReserva('No se pudo conectar con el backend para confirmar la reservacion.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center p-3" style={{ zIndex: 1080 }} onClick={onCerrar}>
      <div className="card border-0 rounded-4 shadow-sm w-100" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }} onClick={(event) => event.stopPropagation()}>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h3 className="h4 mb-1">Confirmar Reservacion</h3>
              <p className="mb-0 text-secondary">
                Habitacion {habitacion.numero} - {habitacion.tipo_habitacion?.nombre}
              </p>
            </div>
            <button type="button" className="btn-close" onClick={onCerrar} aria-label="Cerrar" />
          </div>

          <div className="rounded-3 p-3 mb-3" style={{ backgroundColor: 'var(--hotel-color-fondo)' }}>
            <div className="d-flex justify-content-between small mb-1">
              <span>Check-in</span>
              <strong>{filtrosBusqueda.fecha_entrada}</strong>
            </div>
            <div className="d-flex justify-content-between small mb-1">
              <span>Check-out</span>
              <strong>{filtrosBusqueda.fecha_salida}</strong>
            </div>
            <div className="d-flex justify-content-between small">
              <span>Total estimado</span>
              <strong>{formatearMoneda(precioTotalDesglose || habitacion.precio_total_estimado)}</strong>
            </div>
          </div>

          <DesglosePrecio
            detallesNoches={detallesNoches}
            totalFinal={precioTotalDesglose || habitacion.precio_total_estimado}
            cargando={cargandoDesglose}
            descuento_aplicado={descuento_aplicado}
          />

          {errorReserva ? <div className="alert alert-danger py-2">{errorReserva}</div> : null}

          {exitoReserva ? (
            <div className="alert alert-success py-2">
              <div className="fw-semibold mb-1">{exitoReserva}</div>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-clipboard-check" />
                <span>Codigo de reserva: <strong className="user-select-all">{codigoReserva}</strong></span>
              </div>
              <div className="mt-2">
                <button type="button" className="btn btn-sm btn-outline-success" onClick={onCerrar}>
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form className="row g-2" onSubmit={enviarReserva}>
              <div className="col-12">
                <label className="form-label mb-0" htmlFor="reserva_nombre_huesped_modal">
                  Nombre
                </label>
                <input
                  id="reserva_nombre_huesped_modal"
                  name="nombre_huesped"
                  type="text"
                  className="form-control"
                  value={formulario.nombre_huesped}
                  onChange={actualizarCampo}
                  readOnly={camposUsuarioLlenados}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label mb-0" htmlFor="reserva_email_huesped_modal">
                  Correo
                </label>
                <input
                  id="reserva_email_huesped_modal"
                  name="email_huesped"
                  type="email"
                  className="form-control"
                  value={formulario.email_huesped}
                  onChange={actualizarCampo}
                  readOnly={camposUsuarioLlenados}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label mb-0" htmlFor="reserva_telefono_huesped_modal">
                  Telefono
                </label>
                <input
                  id="reserva_telefono_huesped_modal"
                  name="telefono_huesped"
                  type="text"
                  className="form-control"
                  value={formulario.telefono_huesped}
                  onChange={actualizarCampo}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label mb-0" htmlFor="reserva_codigo_descuento_modal">
                  Codigo de descuento (opcional)
                </label>
                <input
                  id="reserva_codigo_descuento_modal"
                  name="codigo_descuento"
                  type="text"
                  className="form-control"
                  value={formulario.codigo_descuento}
                  onChange={actualizarCampo}
                />
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  cargarDesglosePrecio()
                }}
              >
                Aplicar codigo de descuento
              </button>

              <div className="col-12">
                <label className="form-label mb-0" htmlFor="reserva_notas_modal">
                  Notas
                </label>
                <textarea
                  id="reserva_notas_modal"
                  name="notas"
                  className="form-control"
                  value={formulario.notas}
                  onChange={actualizarCampo}
                  rows={2}
                />
              </div>

              <div className="col-12 d-flex justify-content-end gap-2 mt-3">
                <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-hotel-primary" disabled={guardando}>
                  {guardando ? 'Confirmando...' : 'Confirmar reservacion'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
